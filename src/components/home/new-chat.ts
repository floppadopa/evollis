/**
 * sessionStorage key that carries first-message image attachments from the home
 * composer to the new-conversation flow in /chat/[id]. Images can't ride in the
 * URL (base64 is too large), so they hop through sessionStorage instead.
 */
export const NEW_CHAT_IMAGES_KEY = "evollis:new-chat-images";
