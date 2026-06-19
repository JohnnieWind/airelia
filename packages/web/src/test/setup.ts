import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers);

// AntD 响应式逻辑会访问 matchMedia；jsdom 没有实现，需要提供可监听的最小 mock。
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mediaQueryList: MediaQueryList = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: EventListenerOrEventListenerObject | null) => {
        if (typeof listener === "function") {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      },
      removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject | null) => {
        if (typeof listener === "function") {
          listeners.delete(listener as (event: MediaQueryListEvent) => void);
        }
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: (event: Event) => {
        listeners.forEach((listener) => listener(event as MediaQueryListEvent));
        return true;
      }
    };

    return mediaQueryList;
  }
});

class ResizeObserverMock implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    // rc-textarea/rc-resize-observer 依赖首次 observe 回调来触发布局测量。
    this.callback(
      [
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: {
            bottom: 0,
            height: 24,
            left: 0,
            right: 0,
            toJSON: () => ({}),
            top: 0,
            width: 240,
            x: 0,
            y: 0
          },
          devicePixelContentBoxSize: [],
          target
        }
      ],
      this
    );
  }

  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

const realGetComputedStyle = window.getComputedStyle.bind(window);

window.getComputedStyle = (element: Element, pseudoElt?: string | null) => {
  const style = realGetComputedStyle(element, pseudoElt);

  return new Proxy(style, {
    get(target, property, receiver) {
      if (property === "getPropertyValue") {
        return (propertyName: string) => {
          const value = target.getPropertyValue(propertyName);

          if (value) {
            return value;
          }

          if (propertyName === "box-sizing") {
            return "border-box";
          }

          if (
            propertyName.includes("padding") ||
            propertyName.includes("border") ||
            propertyName === "line-height" ||
            propertyName === "width"
          ) {
            // jsdom 对很多布局属性返回空字符串，补成像素值避免 textarea 高度计算出 NaN。
            return propertyName === "line-height" ? "24px" : propertyName === "width" ? "240px" : "0px";
          }

          return value;
        };
      }

      return Reflect.get(target, property, receiver);
    }
  });
};

Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
  configurable: true,
  get() {
    // rc-textarea 会创建隐藏 textarea 测量单行高度，jsdom 需要稳定的 scrollHeight。
    return 24;
  }
});

afterEach(() => {
  // 每个测试结束后卸载 React 树，保持 DOM 环境干净。
  cleanup();
});
