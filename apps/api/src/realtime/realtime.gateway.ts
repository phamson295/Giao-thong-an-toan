import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { BBox, HazardPoint } from '@gtat/shared';

/** Lưới ô 0,1° (~11 km). Máy khách tham gia các "phòng" ô mà nó đang ở gần. */
const CELL = 0.1;
export const cellRoom = (lng: number, lat: number) =>
  `cell:${Math.floor(lng / CELL)}:${Math.floor(lat / CELL)}`;

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway {
  @WebSocketServer() server: Server;

  /** Máy khách gửi: socket.emit('subscribe', { bbox: [tây, nam, đông, bắc] }) */
  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { bbox: BBox }) {
    const [w, s, e, n] = body?.bbox ?? [];
    if (![w, s, e, n].every(Number.isFinite)) return { ok: false };
    const rooms: string[] = [];
    for (let x = Math.floor(w / CELL); x <= Math.floor(e / CELL); x++) {
      for (let y = Math.floor(s / CELL); y <= Math.floor(n / CELL); y++) {
        rooms.push(`cell:${x}:${y}`);
        if (rooms.length > 100) return { ok: false, error: 'Vùng quá rộng' };
      }
    }
    // Rời phòng cũ, vào phòng mới
    for (const r of client.rooms) if (r.startsWith('cell:')) client.leave(r);
    client.join(rooms);
    return { ok: true, rooms: rooms.length };
  }

  /** Phát điểm cảnh báo mới/cập nhật/xóa tới các xe trong ô tương ứng. */
  broadcastHazard(h: HazardPoint) {
    this.server?.to(cellRoom(h.lng, h.lat)).emit('hazard:upsert', h);
  }
}
