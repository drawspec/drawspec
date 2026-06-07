import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Real-Time Chat System",
  description: "Chat application documented with C4, component, state, and sequence diagrams",
  content: await md`
# Real-Time Chat System

This example documents a real-time chat application supporting both mobile and web clients. The system uses WebSockets for low-latency message delivery, a message broker for event distribution, and a presence service to track online/offline status. When recipients are offline, messages are queued and push notifications are sent to re-engage them.

## System Context

@diagram ./chat-system.arch.ts "Chat platform system context"

The context view shows the external actors and the Chat Platform system boundary. Mobile users connect via native apps while web users connect through browsers. Both use WebSocket connections to the gateway. The system uses a message broker for routing, a presence service for tracking online status, a media service for file uploads, and a notification dispatcher for push notifications.

## Components

@diagram ./chat-system.component.ts "Internal components of the chat system"

The component diagram shows the internal services within the Chat Platform. The WebSocket Gateway terminates WebSocket connections and routes messages to the Message Broker. The Message Broker handles pub/sub for message distribution and notifies the Presence Service of delivery status changes. The Media Service handles file uploads to S3. The Notification Dispatcher sends push notifications via APNs (iOS) and FCM (Android).

## Message Delivery

@diagram ./chat-system.state.ts "Message delivery states"

The state diagram shows the lifecycle of a message from sent to delivery confirmation. A message starts in the Sent state when the sender sends it. When the recipient receives it, the message moves to Delivered. When the recipient opens the message, it transitions to Read. If delivery fails (for example, the recipient is offline), the message enters the Failed state. Failed messages are retried when the recipient comes back online.

## Real-Time Flow

@diagram ./chat-system.sequence.ts "Message delivery sequence with offline handling"

The sequence diagram shows the full message flow. The sender sends a message through the WebSocket Gateway, which publishes it to the Message Broker. The broker checks with the Presence Service whether the recipient is online. If online, the broker delivers the message directly to the recipient. If offline, the message is queued and a push notification is sent to re-engage the recipient. When the recipient comes back online, queued messages are delivered.

## Architecture Decisions

WebSockets provide full-duplex communication for real-time message delivery with lower overhead than HTTP polling. The connection is kept open, allowing the server to push messages to clients without the client repeatedly requesting updates.

The message broker decouples the WebSocket Gateway from business logic. The gateway publishes incoming messages to the broker rather than routing them directly to recipients. This allows the system to add features (analytics, moderation, archiving) by subscribing to the same message stream without modifying the gateway.

The presence service tracks online/offline status using Redis for fast lookups. When a client connects via WebSocket, the presence service records the connection. When the client disconnects (detected via heartbeat timeout), the presence service marks the user as offline and clears queued messages for that user.

Offline message queuing ensures messages are not lost when recipients are temporarily offline. The gateway stores messages for offline recipients and delivers them when the presence service confirms the recipient has reconnected.
`,
});
