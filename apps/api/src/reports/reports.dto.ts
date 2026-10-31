import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export const COMMUNITY_TYPES = ['police_report', 'accident_report', 'road_work_report', 'speed_camera'] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export class CreateReportDto {
  @IsIn(COMMUNITY_TYPES) type: CommunityType;
  @IsLongitude() lng: number;
  @IsLatitude() lat: number;
  @IsOptional() @IsInt() @Min(0) @Max(359) heading?: number;
  /** Mã thiết bị ẩn danh (UUID sinh ngẫu nhiên khi cài app) – không lưu thông tin cá nhân. */
  @IsString() @Length(8, 64) deviceId: string;
}

export class VoteDto {
  @IsIn(['confirm', 'deny']) vote: 'confirm' | 'deny';
  @IsString() @Length(8, 64) deviceId: string;
}
