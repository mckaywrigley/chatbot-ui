import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Announcement } from "@/types/announcement"
import { IconExternalLink, IconSpeakerphone } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"

interface AnnouncementsProps {}

export const Announcements: FC<AnnouncementsProps> = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    // Load announcements from local storage
    const storedAnnouncements = localStorage.getItem("announcements")
    let parsedAnnouncements: Announcement[] = []

    if (storedAnnouncements) {
      parsedAnnouncements = JSON.parse(storedAnnouncements)
    }

    // Filter out announcements that are no longer in state
    const validAnnouncements = announcements.filter((a: Announcement) =>
      parsedAnnouncements.find(storedA => storedA.id === a.id)
    )

    // Add new announcements to the list
    const newAnnouncements = announcements.filter(
      (a: Announcement) =>
        !parsedAnnouncements.find(storedA => storedA.id === a.id)
    )

    // Combine valid and new announcements
    const combinedAnnouncements = [...validAnnouncements, ...newAnnouncements]

    // Mark announcements as read if they are marked as read in local storage
    const updatedAnnouncements = combinedAnnouncements.map(
      (a: Announcement) => {
        const storedAnnouncement = parsedAnnouncements.find(
          (storedA: Announcement) => storedA.id === a.id
        )
        return storedAnnouncement?.read ? { ...a, read: true } : a
      }
    )

    // Update state and local storage
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem("announcements", JSON.stringify(updatedAnnouncements))
  }, [])

  const unreadCount = announcements.filter(a => !a.read).length

  const markAsRead = (id: string) => {
    // Mark announcement as read in local storage and state
    const updatedAnnouncements = announcements.map(a =>
      a.id === id ? { ...a, read: true } : a
    )
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem("announcements", JSON.stringify(updatedAnnouncements))
  }

  const markAllAsRead = () => {
    // Mark all announcements as read in local storage and state
    const updatedAnnouncements = announcements.map(a => ({ ...a, read: true }))
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem("announcements", JSON.stringify(updatedAnnouncements))
  }

  const markAllAsUnread = () => {
    // Mark all announcements as unread in local storage and state
    const updatedAnnouncements = announcements.map(a => ({ ...a, read: false }))
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem("announcements", JSON.stringify(updatedAnnouncements))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer hover:opacity-50">
          <IconSpeakerphone size={SIDEBAR_ICON_SIZE} />
          {unreadCount > 0 && (
            <div className="notification-indicator absolute right-[-4px] top-[-4px] flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="mb-2 w-80" side="top">
        <div className="grid gap-4">
          <div>
            <div className="mb-4 text-left text-xl font-bold leading-none">
              Updates
            </div>

            <div className="grid space-y-4">
              {announcements
                .filter(a => !a.read)
                .map((a: Announcement) => (
                  <div key={a.id}>
                    <div className="block select-none rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium leading-none">
                          {a.title}
                        </div>
                        <div className="text-muted-foreground text-xs leading-snug">
                          {a.date}
                        </div>
                      </div>
                      <div className="text-muted-foreground mt-3 text-sm leading-snug">
                        {a.content}
                      </div>

                      <div className="mt-3 space-x-2">
                        <Button
                          className="h-[26px] text-xs"
                          size="sm"
                          onClick={() => markAsRead(a.id)}
                        >
                          Mark as Read
                        </Button>

                        {a.link && (
                          <a href={a.link} target="_blank" rel="noreferrer">
                            <Button className="h-[26px] text-xs" size="sm">
                              Demo{" "}
                              <IconExternalLink className="ml-1" size={14} />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-1">
              {unreadCount > 0 ? (
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={markAllAsRead}
                >
                  Mark All as Read
                </Button>
              ) : (
                <div className="text-muted-foreground text-sm leading-snug">
                  You are all caught up!
                  {announcements.length > 0 && (
                    <div
                      className="mt-6 cursor-pointer underline"
                      onClick={() => markAllAsUnread()}
                    >
                      Show recent updates
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
