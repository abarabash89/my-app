import { memo, useContext, useEffect } from "react";

import {
  HotkeysNamespaceContext,
  HotkeysServiceContext,
  HotKeyListener
} from "../hotkeys";

interface IHotKeyProps {
  keyMap: string;
  description: string;
  onKeyDown?: HotKeyListener;
  onKeyUp?: HotKeyListener;
  ignoreNamespace?: boolean;
  ignoreFocusedElements?: boolean;
}

export const HotKey = memo<IHotKeyProps>(
  ({
    keyMap,
    onKeyDown,
    onKeyUp,
    description,
    ignoreFocusedElements,
    ignoreNamespace
  }) => {
    const service = useContext(HotkeysServiceContext);
    const namespace = useContext(HotkeysNamespaceContext);

    useEffect(() => {
      if (!service) {
        return;
      }
      const options = {
        description1: description,
        namespace,
        ignoreNamespace,
        ignoreFocusedElements
      };
      onKeyDown && service.add(keyMap, onKeyDown, "keydown", options);
      onKeyUp && service.add(keyMap, onKeyUp, "keyup", options);
      return () => {
        onKeyDown && service.remove(keyMap, onKeyDown, "keydown", namespace);
        onKeyUp && service.remove(keyMap, onKeyUp, "keyup", namespace);
      };
    }, [
      description,
      ignoreFocusedElements,
      ignoreNamespace,
      keyMap,
      namespace,
      onKeyDown,
      onKeyUp,
      service
    ]);

    return null;
  }
);