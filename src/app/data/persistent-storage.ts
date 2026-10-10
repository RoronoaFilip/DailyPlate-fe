/** Ask the browser not to clear this app's data when the phone is short on space. Safe to ignore a refusal. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
