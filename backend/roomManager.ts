import { User, Room } from './types';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    getRoom(roomId: string): Room {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                users: new Map<string, User>(),
                code: "// Start code here",
                videoUsers: new Map(),
            });
        }
        return this.rooms.get(roomId)!;
    }
    addUser(roomId: string, user: User): void {
        const room = this.getRoom(roomId);
        room.users.set(user.id, user);
    }
    removeUser(roomId: string, userId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.users.delete(userId);
        room.videoUsers.delete(userId);

        if (room.users.size === 0) {
            this.rooms.delete(roomId);
            return true;
        }

        return false;
    }
    getUsers(roomId: string): User[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        return Array.from(room.users.values());
    }
    updateCode(roomId: string, code: string): void {
        const room = this.getRoom(roomId);
        room.code = code;
    }

    addVideoUser(
        roomId: string,
        userId: string,
        userName: string,
        position = { x: 20, y: 20 }
    ): void {
        const room = this.getRoom(roomId);
        room.videoUsers.set(userId, {
            userId,
            userName,
            position
        });
    }

    removeVideoUser(roomId: string, userId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.videoUsers.delete(userId);
        }
    }

    getVideoUsers(roomId: string, excludeUserId?: string): any[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];

        const videoUsers = Array.from(room.videoUsers.values());
        if (excludeUserId) {
            return videoUsers.filter(user => user.userId !== excludeUserId);
        }
        return videoUsers;
    }

    updateVideoPosition(
        roomId: string,
        userId: string,
        position: { x: number; y: number }
    ): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const videoUser = room.videoUsers.get(userId);
        if (!videoUser) return false;

        videoUser.position = position;
        return true;
    }

    /**
     * Check if room exists
     */
    hasRoom(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    /**
     * Get room stats
     */
    getRoomStats(): { totalRooms: number; totalUsers: number; totalVideoUsers: number } {
        let totalUsers = 0;
        let totalVideoUsers = 0;

        this.rooms.forEach(room => {
            totalUsers += room.users.size;
            totalVideoUsers += room.videoUsers.size;
        });

        return {
            totalRooms: this.rooms.size,
            totalUsers,
            totalVideoUsers
        };
    }
}
