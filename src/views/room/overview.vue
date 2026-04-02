<template>
    <div class="room-overview">
        <div class="toolbar">
            <div class="toolbar-left">
                <div class="title-block">
                    <h2>房态总览</h2>
                    <p>横向看房间，纵向看日期，适合管家快速判断入住、预定与保洁安排。</p>
                </div>
                <div class="legend">
                    <span v-for="item in legendItems" :key="item.key" class="legend-item">
                        <i :class="['legend-dot', `legend-dot-${item.key}`]"></i>
                        {{ item.label }}
                    </span>
                </div>
            </div>
            <div class="toolbar-right">
                <el-select v-model="selectedCommunityId" clearable placeholder="全部社区" class="filter-item">
                    <el-option
                        v-for="item in communityOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </el-select>
                <el-date-picker
                    v-model="dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    value-format="YYYY-MM-DD"
                    :clearable="false"
                    class="filter-item date-range"
                />
                <el-button @click="shiftRange(-7)">前一周</el-button>
                <el-button @click="shiftRange(7)">后一周</el-button>
                <el-button type="primary" @click="refreshData">刷新</el-button>
            </div>
        </div>

        <div class="summary-grid">
            <el-card shadow="hover" class="summary-card">
                <div class="summary-label">展示房间</div>
                <div class="summary-value">{{ filteredRooms.length }}</div>
                <div class="summary-desc">当前筛选下参与总览的房间数</div>
            </el-card>
            <el-card shadow="hover" class="summary-card">
                <div class="summary-label">已入住</div>
                <div class="summary-value danger">{{ summaryStats.occupied }}</div>
                <div class="summary-desc">所选日期范围内的入住日历格数量</div>
            </el-card>
            <el-card shadow="hover" class="summary-card">
                <div class="summary-label">已预定</div>
                <div class="summary-value booked">{{ summaryStats.booked }}</div>
                <div class="summary-desc">尚未入住但已被锁定的日历格</div>
            </el-card>
            <el-card shadow="hover" class="summary-card">
                <div class="summary-label">待保洁</div>
                <div class="summary-value cleaning">{{ summaryStats.cleaning }}</div>
                <div class="summary-desc">退房后待打扫或保洁占用状态</div>
            </el-card>
        </div>

        <el-alert
            v-if="isMockData"
            type="warning"
            show-icon
            :closable="false"
            title="当前展示的是演示房态数据"
            description="房间列表或预订接口暂不可用时，页面会自动回退到演示数据，方便先确认总览布局和交互。"
            class="mgb16"
        />

        <div class="board-card">
            <div class="board-header">
                <div class="board-title">
                    <strong>{{ boardTitle }}</strong>
                    <span>{{ boardSubtitle }}</span>
                </div>
                <div class="board-note" v-if="hoveredCell?.guestName">
                    提示：入住人 {{ hoveredCell.guestName }}
                </div>
            </div>
            <div class="board-wrapper">
                <table class="overview-table">
                    <thead>
                        <tr>
                            <th class="room-col sticky-col">房间信息</th>
                            <th v-for="day in visibleDates" :key="day.date" :class="['date-col', { today: day.isToday }]">
                                <div class="date-weekday">{{ day.weekday }}</div>
                                <div class="date-value">{{ day.label }}</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="room in filteredRooms" :key="room.id">
                            <td class="room-col sticky-col">
                                <div class="room-name">{{ room.name }}</div>
                                <div class="room-meta">{{ room.code || `ROOM-${room.id}` }} · {{ roomTypeLabel(room.roomType) }}</div>
                                <div class="room-meta">社区 {{ room.communityId }} · {{ roomPriceLabel(room.id) }}</div>
                            </td>
                            <td
                                v-for="day in visibleDates"
                                :key="`${room.id}-${day.date}`"
                                :class="['status-cell', `status-${getRoomDayStatus(room.id, day.date).key}`]"
                                @mouseenter="hoveredCell = getRoomDayStatus(room.id, day.date)"
                                @mouseleave="hoveredCell = null">
                                <div class="status-badge">{{ getRoomDayStatus(room.id, day.date).label }}</div>
                                <div v-if="getRoomDayStatus(room.id, day.date).guestName" class="status-note">
                                    {{ getRoomDayStatus(room.id, day.date).guestName }}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="room-overview">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { AxiosError } from 'axios';
import {
    fetchRoomBookingList,
    fetchRoomList,
    type RoomBookingRequestRecord,
    type RoomRecord,
} from '@/api/index';

type RoomStatusKey = 'occupied' | 'booked' | 'cleaning' | 'available' | 'blocked';

interface RoomDayStatus {
    key: RoomStatusKey;
    label: string;
    guestName?: string;
    bookingId?: number;
}

interface MockPricePlan {
    roomId: number;
    label: string;
}

const roomTypeMap: Record<string, string> = {
    private: '独立房间',
    shared: '共享房间',
};

const legendItems: Array<{ key: RoomStatusKey; label: string }> = [
    { key: 'occupied', label: '已入住' },
    { key: 'booked', label: '已预定' },
    { key: 'cleaning', label: '待保洁' },
    { key: 'available', label: '可入住' },
    { key: 'blocked', label: '停用/关闭' },
];

const roomPricePlans = ref<MockPricePlan[]>([]);
const rooms = ref<RoomRecord[]>([]);
const bookings = ref<RoomBookingRequestRecord[]>([]);
const selectedCommunityId = ref<number | undefined>();
const isMockData = ref(false);
const hoveredCell = ref<RoomDayStatus | null>(null);

const formatDate = (input: Date | string) => {
    const date = typeof input === 'string' ? new Date(`${input}T00:00:00`) : input;
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (dateText: string, amount: number) => {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + amount);
    return formatDate(date);
};

const diffDays = (start: string, end: string) => {
    const startTime = new Date(`${start}T00:00:00`).getTime();
    const endTime = new Date(`${end}T00:00:00`).getTime();
    return Math.round((endTime - startTime) / 86400000);
};

const isWithinRange = (date: string, start: string, end: string) => date >= start && date <= end;
const isCheckInDay = (booking: RoomBookingRequestRecord, date: string) => booking.checkIn === date;
const isCheckOutDay = (booking: RoomBookingRequestRecord, date: string) => booking.checkOut === date;
const isOccupiedDay = (booking: RoomBookingRequestRecord, date: string) =>
    Boolean(booking.checkIn && booking.checkOut && date >= booking.checkIn && date < booking.checkOut);
const isBookedDay = (booking: RoomBookingRequestRecord, date: string) =>
    booking.status === 'SUBMITTED' && Boolean(booking.checkIn && booking.checkOut && date >= booking.checkIn && date < booking.checkOut);

const today = formatDate(new Date());
const dateRange = ref<[string, string]>([today, addDays(today, 13)]);

const visibleDates = computed(() => {
    const [start, end] = dateRange.value;
    const days = diffDays(start, end);
    return Array.from({ length: days + 1 }, (_, index) => {
        const current = addDays(start, index);
        const date = new Date(`${current}T00:00:00`);
        const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
        return {
            date: current,
            label: `${date.getMonth() + 1}/${date.getDate()}`,
            weekday,
            isToday: current === today,
        };
    });
});

const communityOptions = computed(() => {
    const ids = Array.from(new Set(rooms.value.map((item) => item.communityId))).sort((a, b) => a - b);
    return ids.map((id) => ({
        label: `社区 ${id}`,
        value: id,
    }));
});

const filteredRooms = computed(() => {
    return rooms.value.filter((room) => {
        if (!selectedCommunityId.value) {
            return true;
        }
        return room.communityId === selectedCommunityId.value;
    });
});

const boardTitle = computed(() => {
    if (!selectedCommunityId.value) {
        return '全部社区房态排期';
    }
    return `社区 ${selectedCommunityId.value} 房态排期`;
});

const boardSubtitle = computed(() => `${dateRange.value[0]} 至 ${dateRange.value[1]}`);

const roomTypeLabel = (value?: string | null) => {
    if (!value) {
        return '未设置房型';
    }
    return roomTypeMap[value] || value;
};

const roomPriceLabel = (roomId: number) => {
    const record = roomPricePlans.value.find((item) => item.roomId === roomId);
    return record?.label || '价格待配置';
};

const generateMockData = () => {
    rooms.value = [
        { id: 101, communityId: 1045, name: '101大床房', code: 'A101', roomType: 'private', status: 'published' },
        { id: 102, communityId: 1045, name: '102双床房', code: 'A102', roomType: 'shared', status: 'published' },
        { id: 201, communityId: 1044, name: '201卫浴大床', code: 'B201', roomType: 'private', status: 'published' },
        { id: 202, communityId: 1044, name: '202公共卫浴大床', code: 'B202', roomType: 'private', status: 'published' },
        { id: 203, communityId: 1044, name: '203双床房', code: 'B203', roomType: 'shared', status: 'published' },
        { id: 302, communityId: 1045, name: '302小阁楼', code: 'C302', roomType: 'private', status: 'offline' },
    ];
    roomPricePlans.value = [
        { roomId: 101, label: '2000/月 1300/半月 800/周' },
        { roomId: 102, label: '1300/月/床位 900/半月/床位' },
        { roomId: 201, label: '2000/月 1300/半月 800/周' },
        { roomId: 202, label: '1500/月 1000/半月 700/周' },
        { roomId: 203, label: '1300/月/床位 900/半月/床位' },
        { roomId: 302, label: '1000/月 700/半月 400/周' },
    ];
    bookings.value = [
        {
            id: 1,
            userId: 1,
            communityId: 1045,
            roomId: 101,
            checkIn: addDays(today, -1),
            checkOut: addDays(today, 5),
            guestName: 'Allen',
            status: 'APPROVED',
        },
        {
            id: 2,
            userId: 2,
            communityId: 1045,
            roomId: 102,
            checkIn: addDays(today, 2),
            checkOut: addDays(today, 8),
            guestName: 'Miya',
            status: 'SUBMITTED',
        },
        {
            id: 3,
            userId: 3,
            communityId: 1044,
            roomId: 201,
            checkIn: addDays(today, 0),
            checkOut: addDays(today, 10),
            guestName: 'Leo',
            status: 'APPROVED',
        },
        {
            id: 4,
            userId: 4,
            communityId: 1044,
            roomId: 202,
            checkIn: addDays(today, 6),
            checkOut: addDays(today, 12),
            guestName: 'Zoey',
            status: 'APPROVED',
        },
        {
            id: 5,
            userId: 5,
            communityId: 1044,
            roomId: 203,
            checkIn: addDays(today, -3),
            checkOut: addDays(today, 2),
            guestName: 'Dylan',
            status: 'APPROVED',
        },
    ];
};

const refreshData = async () => {
    try {
        const [roomRes, bookingRes] = await Promise.all([
            fetchRoomList({ page: 1, size: 200 }),
            fetchRoomBookingList({ page: 1, size: 500 }),
        ]);
        rooms.value = roomRes.data.data?.list ?? [];
        bookings.value = bookingRes.data.data?.list ?? [];
        roomPricePlans.value = rooms.value.map((room, index) => ({
            roomId: room.id,
            label: index % 2 === 0 ? '2000/月 1300/半月 800/周' : '1300/月/床位 900/半月/床位',
        }));
        isMockData.value = false;
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        generateMockData();
        isMockData.value = true;
        ElMessage.warning(err.response?.data?.message || '真实房态接口暂不可用，已切换到演示数据');
    }
};

const getRoomDayStatus = (roomId: number, date: string): RoomDayStatus => {
    const room = rooms.value.find((item) => item.id === roomId);
    if (room?.status === 'offline') {
        return { key: 'blocked', label: '停用' };
    }

    const roomBookings = bookings.value
        .filter((item) => item.roomId === roomId && item.checkIn && item.checkOut)
        .filter((item) => isWithinRange(date, item.checkIn as string, addDays(item.checkOut as string, 0)));

    const occupiedBooking = roomBookings.find((item) => item.status === 'APPROVED' && isOccupiedDay(item, date));
    if (occupiedBooking) {
        return {
            key: 'occupied',
            label: '已入住',
            guestName: occupiedBooking.guestName || undefined,
            bookingId: occupiedBooking.id,
        };
    }

    const bookedBooking = roomBookings.find((item) => isBookedDay(item, date));
    if (bookedBooking) {
        return {
            key: 'booked',
            label: '已预定',
            guestName: bookedBooking.guestName || undefined,
            bookingId: bookedBooking.id,
        };
    }

    const cleaningBooking = roomBookings.find((item) => item.status === 'APPROVED' && isCheckOutDay(item, date));
    if (cleaningBooking) {
        return {
            key: 'cleaning',
            label: '待保洁',
            guestName: cleaningBooking.guestName || undefined,
            bookingId: cleaningBooking.id,
        };
    }

    const sameDayCheckIn = roomBookings.find((item) => item.status === 'APPROVED' && isCheckInDay(item, date));
    if (sameDayCheckIn) {
        return {
            key: 'occupied',
            label: '入住日',
            guestName: sameDayCheckIn.guestName || undefined,
            bookingId: sameDayCheckIn.id,
        };
    }

    return {
        key: 'available',
        label: '可入住',
    };
};

const summaryStats = computed(() => {
    const stats = {
        occupied: 0,
        booked: 0,
        cleaning: 0,
    };

    filteredRooms.value.forEach((room) => {
        visibleDates.value.forEach((day) => {
            const status = getRoomDayStatus(room.id, day.date).key;
            if (status === 'occupied') {
                stats.occupied += 1;
            } else if (status === 'booked') {
                stats.booked += 1;
            } else if (status === 'cleaning') {
                stats.cleaning += 1;
            }
        });
    });

    return stats;
});

const shiftRange = (amount: number) => {
    const [start, end] = dateRange.value;
    dateRange.value = [addDays(start, amount), addDays(end, amount)];
};

refreshData();
</script>

<style scoped>
.room-overview {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 24px;
    border-radius: 18px;
    background: linear-gradient(135deg, #fff8ef 0%, #ffffff 58%, #eef7ff 100%);
    box-shadow: 0 12px 30px rgba(34, 60, 80, 0.08);
}

.toolbar-left {
    min-width: 0;
}

.toolbar-right {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
}

.title-block h2 {
    margin: 0 0 8px;
    font-size: 24px;
    color: #233044;
}

.title-block p {
    margin: 0;
    color: #667085;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 18px;
    margin-top: 16px;
}

.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #44546a;
    font-size: 13px;
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.legend-dot-occupied {
    background: #f56c6c;
}

.legend-dot-booked {
    background: #f3c3db;
}

.legend-dot-cleaning {
    background: #ccefe8;
}

.legend-dot-available {
    background: #f6f8fb;
    border: 1px solid #d8dee9;
}

.legend-dot-blocked {
    background: #c7ccd8;
}

.filter-item {
    width: 160px;
}

.date-range {
    width: 260px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
}

.summary-card {
    border-radius: 16px;
}

.summary-label {
    color: #667085;
    font-size: 13px;
}

.summary-value {
    margin-top: 12px;
    font-size: 30px;
    line-height: 1;
    color: #223042;
    font-weight: 700;
}

.summary-value.danger {
    color: #f56c6c;
}

.summary-value.booked {
    color: #d36aa3;
}

.summary-value.cleaning {
    color: #38a08d;
}

.summary-desc {
    margin-top: 10px;
    color: #98a2b3;
    font-size: 12px;
}

.board-card {
    padding: 18px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 32px rgba(15, 23, 42, 0.06);
}

.board-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.board-title {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.board-title strong {
    font-size: 18px;
    color: #223042;
}

.board-title span,
.board-note {
    color: #8b6f47;
    font-size: 13px;
}

.board-wrapper {
    overflow: auto;
    border: 1px solid #e8ebf0;
    border-radius: 14px;
}

.overview-table {
    width: max-content;
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: #fff;
}

.overview-table th,
.overview-table td {
    border-right: 1px solid #e8ebf0;
    border-bottom: 1px solid #e8ebf0;
}

.overview-table th {
    position: sticky;
    top: 0;
    z-index: 4;
    background: #f8fafc;
}

.sticky-col {
    position: sticky;
    left: 0;
    z-index: 3;
    background: #fff;
}

.overview-table th.sticky-col {
    z-index: 5;
    background: #f8fafc;
}

.room-col {
    width: 220px;
    min-width: 220px;
    padding: 14px 16px;
    text-align: left;
}

.date-col {
    width: 92px;
    min-width: 92px;
    padding: 10px 8px;
    text-align: center;
}

.date-col.today {
    background: #fff6df;
}

.date-weekday {
    font-size: 12px;
    color: #98a2b3;
}

.date-value {
    margin-top: 4px;
    color: #223042;
    font-weight: 600;
}

.room-name {
    font-size: 15px;
    font-weight: 700;
    color: #223042;
}

.room-meta {
    margin-top: 6px;
    font-size: 12px;
    color: #76839a;
}

.status-cell {
    width: 92px;
    min-width: 92px;
    height: 64px;
    padding: 6px;
    background: #fff;
    vertical-align: middle;
    text-align: center;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 58px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.2;
}

.status-note {
    margin-top: 6px;
    font-size: 11px;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.status-occupied {
    background: #fff5f5;
}

.status-occupied .status-badge {
    background: #f56c6c;
    color: #fff;
}

.status-booked {
    background: #fff8fc;
}

.status-booked .status-badge {
    background: #f5d3e4;
    color: #8f3f66;
}

.status-cleaning {
    background: #f0fbf7;
}

.status-cleaning .status-badge {
    background: #d9f3eb;
    color: #237a69;
}

.status-available {
    background: #fff;
}

.status-available .status-badge {
    background: #f6f8fb;
    color: #7b8797;
}

.status-blocked {
    background: #f4f5f8;
}

.status-blocked .status-badge {
    background: #d7dce5;
    color: #616a79;
}

.mgb16 {
    margin-bottom: 0;
}

@media (max-width: 1200px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 900px) {
    .toolbar {
        flex-direction: column;
    }

    .toolbar-right {
        justify-content: flex-start;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }
}
</style>
