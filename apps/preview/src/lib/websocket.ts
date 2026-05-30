import type { Diagnostic } from "@drawspec/core";
import { browser } from "$app/environment";
import {
  connected,
  currentSvg,
  diagnostics as diagnosticsStore,
  diagrams,
  selectedId,
} from "$lib/stores/diagram";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

interface WsUpdateMessage {
  type: "update";
  diagramId: string;
  svg: string;
}

interface WsDiagnosticsMessage {
  type: "diagnostics";
  items: Diagnostic[];
}

interface WsInitMessage {
  type: "init";
  diagrams: { diagramId: string; svg: string }[];
}

type WsMessage = WsUpdateMessage | WsDiagnosticsMessage | WsInitMessage;

export function connectWebSocket(url?: string) {
  if (!browser) return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = url ?? `${protocol}//${location.host}/ws`;

  if (ws) {
    ws.close();
  }

  ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    connected.set(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.addEventListener("close", () => {
    connected.set(false);
    scheduleReconnect(wsUrl);
  });

  ws.addEventListener("error", () => {
    connected.set(false);
    ws?.close();
  });

  ws.addEventListener("message", (event) => {
    const message: WsMessage = JSON.parse(event.data);

    switch (message.type) {
      case "init":
        diagrams.set(
          message.diagrams.map((d) => ({
            id: d.diagramId,
            label: d.diagramId,
            svg: d.svg,
          }))
        );
        if (message.diagrams.length > 0) {
          selectedId.set(message.diagrams[0].diagramId);
          currentSvg.set(message.diagrams[0].svg);
        }
        break;

      case "update":
        diagrams.update((list) => {
          const idx = list.findIndex((d) => d.id === message.diagramId);
          if (idx >= 0) {
            list[idx] = { ...list[idx], svg: message.svg };
          } else {
            list.push({
              id: message.diagramId,
              label: message.diagramId,
              svg: message.svg,
            });
          }
          return list;
        });
        selectedId.update((current) => {
          if (current === message.diagramId) {
            currentSvg.set(message.svg);
          }
          return current;
        });
        break;

      case "diagnostics":
        diagnosticsStore.set(message.items);
        break;
    }
  });
}

function scheduleReconnect(url: string) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket(url);
  }, 2000);
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
  connected.set(false);
}
