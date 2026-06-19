import type { ButtonProps } from "antd";
import classNames from "classnames";
import React, { createContext, forwardRef, useContext } from "react";

import { IconButton } from "./sparkDesignRuntime";

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
