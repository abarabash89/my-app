import { HotKeyListenerList } from "./hotkeys-listener-list";
import { keyCodeMap, keyMap, KeysNames } from "./key-codes";
import { HotKeyListener, IHotKeyListener, HotKeyEventTypes } from "./types";

const EventSpecialKeysMapping: [(event: KeyboardEvent) => boolean, number][] = [
  [(event: KeyboardEvent): boolean => event.metaKey, keyMap.cmd],
  [(event: KeyboardEvent): boolean => event.ctrlKey, keyMap.ctrl],
  [(event: KeyboardEvent): boolean => event.altKey, keyMap.alt],
  [(event: KeyboardEvent): boolean => event.shiftKey, keyMap.shift]
];

interface IHandlerOptions {
  description?: string;
  namespace?: string;
  ignoreNamespace?: boolean;
  ignoreFocusedElements?: boolean;
}
type HotkeysStoreType = Map<string, HotKeyListenerList>;
interface IHotkeysPreview {
  [keymap: string]: string;
}

interface IHotkeysServiceConfig {
  ignoredKeyCodes: number[];
  ignoredTagNames: string[];
  keysSeparator: string;
}
const DefaultHotkeysServiceConfig: IHotkeysServiceConfig = {
  ignoredKeyCodes: [keyMap.shift, keyMap.cmd, keyMap.ctrl, keyMap.alt],
  ignoredTagNames: ["INPUT", "TEXTAREA"],
  keysSeparator: "+"
};

export class HotkeysService {
  private config: IHotkeysServiceConfig;
  private handlerStore: Map<HotKeyEventTypes, HotkeysStoreType> = new Map();
  private currentNamespace = "";

  constructor(userConfig: Partial<IHotkeysServiceConfig> = {}) {
    this.config = {
      ...DefaultHotkeysServiceConfig,
      ...userConfig
    };
    document.addEventListener("keydown", this.keyboardEventListener);
    document.addEventListener("keyup", this.keyboardEventListener);
  }

  private convertKeysToStoreKey(keys: string[] | string): string {
    if (Array.isArray(keys)) {
      return keys.join(this.config.keysSeparator);
    }
    return keys;
  }

  private findHandler(
    eventType: HotKeyEventTypes,
    keys: number[]
  ): IHotKeyListener | undefined {
    const keysNames = keys.reduce<KeysNames[]>((keysNames, key) => {
      keysNames.push(keyCodeMap[key]);
      return keysNames;
    }, []);
    const handlerStore = this.handlerStore.get(eventType);
    const handlerList = handlerStore?.get(
      this.convertKeysToStoreKey(keysNames)
    );
    return handlerList?.get(this.currentNamespace);
  }

  private getKeysFromEvent(event: KeyboardEvent): number[] {
    const keys = EventSpecialKeysMapping.reduce<number[]>(
      (keys, [isPressed, key]) => {
        isPressed(event) && keys.push(key);
        return keys;
      },
      []
    );
    keys.push(event.keyCode);
    return keys;
  }

  private keyboardEventListener = (event: KeyboardEvent) => {
    if (this.config.ignoredKeyCodes.includes(event.keyCode)) {
      return;
    }

    const handler = this.findHandler(
      event.type as HotKeyEventTypes,
      this.getKeysFromEvent(event)
    );
    if (!handler) {
      return;
    }

    const ignoreHotKeyAction =
      !handler.ignoreFocusedElements &&
      this.config.ignoredTagNames.includes(
        (event.target as HTMLElement).tagName
      );
    if (ignoreHotKeyAction) {
      return;
    }

    handler.listener(event);
    event.preventDefault();
  };

  setCurrentNamespace(namespace = ""): HotkeysService {
    this.currentNamespace = namespace;
    return this;
  }
  getCurrentNamespace(): string {
    return this.currentNamespace;
  }

  add(
    hotkeys: string,
    listener: HotKeyListener,
    eventType: HotKeyEventTypes = "keydown",
    options: IHandlerOptions = {}
  ): HotkeysService {
    const storeKey = this.convertKeysToStoreKey(hotkeys);

    const handlerStore: HotkeysStoreType =
      this.handlerStore.get(eventType) || new Map();
    const list = handlerStore.get(storeKey) || new HotKeyListenerList();

    list.add({
      listener,
      ignoreNamespace: options.ignoreNamespace || false,
      ignoreFocusedElements: options.ignoreFocusedElements || false,
      namespace: options.namespace || "",
      description: options.description || ""
    });

    this.handlerStore.set(eventType, handlerStore.set(storeKey, list));
    return this;
  }

  remove(
    hotkeys: string,
    listener: HotKeyListener,
    eventType: HotKeyEventTypes = "keydown",
    namespace = ""
  ): HotkeysService {
    const storeKey = this.convertKeysToStoreKey(hotkeys);

    const handlerStore = this.handlerStore.get(eventType);
    if (!handlerStore) {
      return this;
    }

    const list = handlerStore.get(storeKey);
    if (list) {
      list.remove({ listener, namespace });
    }

    return this;
  }

  getHotkeysWithDescriptions(): IHotkeysPreview {
    return Array.from(this.handlerStore).reduce<IHotkeysPreview>(
      (hotkeysWithDescriptions, [, store]) => {
        const hotKeyList = Object.fromEntries(
          Array.from(store).filter(
            ([, list]) => list.get(this.currentNamespace)?.description
          )
        );
        return Object.assign(hotkeysWithDescriptions, hotKeyList);
      },
      {}
    );
  }
}
