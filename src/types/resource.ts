export interface ResourceQuery {
    page?: number;
    size?: number;
    keyword?: string;
    resourceType?: string;
    status?: string;
    visibility?: string;
}

export interface ResourceAsset {
    id?: number | string;
    resourceId?: number | string;
    resourceType?: string;
    storageProvider?: string;
    bucket?: string;
    region?: string;
    objectKey?: string;
    fileName?: string;
    url?: string;
    contentType?: string;
    sizeBytes?: number;
    checksum?: string;
    status?: string;
    visibility?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}
