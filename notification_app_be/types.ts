export type NotificationType = 'placement' | 'event' | 'result';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export interface CreateNotificationRequest {
    type: NotificationType;
    title: string;
    message: string;
}

export const VALID_NOTIFICATION_TYPES: NotificationType[] = ['placement', 'event', 'result'];
