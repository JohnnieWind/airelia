import type { ButtonProps } from "antd";
import classNames from "classnames";
import React, { createContext, forwardRef, useContext } from "react";

import { IconButton } from "./sparkDesignRuntime";

// AgentScope Chat 原始 ActionButton 使用 forwardRef(ActionButton)，但 ActionButton 只接收 props。
// 本地替身保持相同导出，同时显式接收 ref，消除 React 开发态警告。
type ActionName = "onSend" | "onClear" | "onCancel" | "onSpeech";

interface ActionButtonContextProps {
  prefixCls: string;
  onSend?: VoidFunction;
  onSendDisabled?: boolean;
  onClear?: VoidFunction;
  onClearDisabled?: boolean;
  onCancel?: VoidFunction;
  onCancelDisabled?: boolean;
  onSpeech?: VoidFunction;
  onSpeechDisabled?: boolean;
  speechRecording?: boolean;
  disabled?: boolean;
}

interface ActionButtonProps extends Omit<ButtonProps, "onClick"> {
  action: ActionName;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

const ActionButtonContext = createContext<ActionButtonContextProps>({ prefixCls: "" });

// Chat Sender 用 action 名称驱动按钮行为，这里把 action 映射回对应禁用状态。
function getActionDisabled(context: ActionButtonContextProps, action: ActionName): boolean | undefined {
  switch (action) {
    case "onSend":
      return context.onSendDisabled;
    case "onClear":
      return context.onClearDisabled;
    case "onCancel":
      return context.onCancelDisabled;
    case "onSpeech":
      return context.onSpeechDisabled;
  }
}

function ActionButtonWithRef(
  { action, className, disabled, onClick, ...restProps }: ActionButtonProps,
  ref: React.ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
) {
  const context = useContext(ActionButtonContext);
  const actionHandler = context[action];
  // 根级 disabled 优先级最高，其次才是按钮自身和 action 级禁用状态。
  const mergedDisabled = context.disabled ?? disabled ?? getActionDisabled(context, action);

  return (
    <IconButton
      bordered={false}
      className={classNames(context.prefixCls, className, {
        [`${context.prefixCls}-disabled`]: mergedDisabled
      })}
      disabled={mergedDisabled}
      onClick={(event) => {
        if (mergedDisabled) {
          return;
        }

        actionHandler?.();
        onClick?.(event);
      }}
      ref={ref}
      {...restProps}
    />
  );
}

const ActionButton = forwardRef(ActionButtonWithRef);

export { ActionButton, ActionButtonContext };
export default ActionButton;
