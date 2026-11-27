/** Server actions that can fail for user-fixable reasons return the message instead of throwing
 * (in production Next hides the text of thrown errors from the client). */
export type ActionResult = { error?: string; id?: string };
