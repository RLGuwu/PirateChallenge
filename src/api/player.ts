const PLAYER_ID_KEY = 'pirate-battle:player-id';
const PLAYER_NAME_KEY = 'pirate-battle:player-name';
const DEFAULT_PLAYER_NAME = 'Captain Jack';

export interface LocalPlayer {
  id: string;
  name: string;
}

/** The local player's persistent identity, used to attribute matches and highlight "you" on the ranking. */
export function getLocalPlayer(): LocalPlayer {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }

  let name = localStorage.getItem(PLAYER_NAME_KEY);
  if (!name) {
    name = DEFAULT_PLAYER_NAME;
    localStorage.setItem(PLAYER_NAME_KEY, name);
  }

  return { id, name };
}
