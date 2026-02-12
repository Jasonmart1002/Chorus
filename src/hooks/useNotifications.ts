import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { playNotificationSound } from "../lib/sounds";
import type { AttentionEvent } from "../types/messages";
import { useAgentStore } from "../store/agentStore";

export function useNotifications() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    async function setup() {
      let permGranted = await isPermissionGranted();
      if (!permGranted) {
        const perm = await requestPermission();
        permGranted = perm === "granted";
      }

      unlisten = await listen<AttentionEvent>(
        "agent-entered-queue",
        (event) => {
          const { agent_id, reason } = event.payload;
          const agent = useAgentStore.getState().agents[agent_id];
          const name = agent?.config.name || "Agent";

          playNotificationSound();

          if (permGranted) {
            sendNotification({
              title: "Chorus",
              body:
                reason === "errored"
                  ? `${name} encountered an error`
                  : `${name} finished — needs your input`,
            });
          }
        }
      );
    }

    setup();
    return () => {
      unlisten?.();
    };
  }, []);
}
