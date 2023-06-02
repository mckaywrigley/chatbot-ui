import { z } from "zod";

export type AnnouncementDate = `${number}-${number}-${number}`;

// key: announcement:{AnnouncementDate}
export const announcement = z.string();
export type Announcement = z.infer<typeof announcement>;
