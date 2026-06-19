import carbonThemeToken from "@agentscope-ai/design/lib/antd/themes/carbonTheme.json";
import generateTheme from "@agentscope-ai/design/lib/antd/themes/generateTheme";
import generateThemeByToken from "@agentscope-ai/design/lib/antd/themes/generateThemeByToken";
import IconFont from "@agentscope-ai/design/lib/components/commonComponents/IconFont";
import SparkTag from "@agentscope-ai/design/lib/components/commonComponents/Tag";
import { getCommonConfig, setCommonConfig, useCommonConfig } from "@agentscope-ai/design/lib/config";
import type { ButtonProps, ConfigProviderProps, TooltipProps } from "antd";
import { App as AntdApp, Button as AntdButton, ConfigProvider as AntdConfigProvider, Tooltip as AntdTooltip } from "antd";
import type { TooltipRef } from "antd/es/tooltip";
import classNames from "classnames";
import { useLayoutEffect } from "react";
import React, { forwardRef } from "react";

type SparkButtonProps = Omit<ButtonProps, "type"> & {
  iconSize?: React.CSSProperties["fontSize"];
  iconType?: string;
  tooltipContent?: React.ReactNode;
  type?: ButtonProps["type"] | "primaryLess" | "textCompact";
};

type SparkIconButtonProps = SparkButtonProps & {
  bordered?: boolean;
};

type SparkTooltipProps = TooltipProps & {
  maxHeight?: React.CSSProperties["maxHeight"];
  mode?: "dark" | "light";
  overlayClassName?: string;
};

type SparkConfigProviderProps = ConfigProviderProps & {
  className?: string;
  iconfont?: string;
  prefix?: string;
  style?: React.CSSProperties;
};

function getSizedIcon({
  icon,
  iconSize,
  iconType,
  size
}: Pick<SparkButtonProps, "icon" | "iconSize" | "iconType" | "size">) {
  if (iconType) {
    return <IconFont type={iconType} size={iconSize ?? size} />;
  }

  if (React.isValidElement<{ size?: SparkButtonProps["iconSize"] }>(icon)) {
    return React.cloneElement(icon, { size: iconSize ?? size });
  }

  return icon;
}

const Tooltip = forwardRef<TooltipRef, SparkTooltipProps>(function SparkTooltip(
  {
    align,
    arrow,
    classNames: tooltipClassNames,
    getPopupContainer,
    maxHeight = "90vh",
    mode = "dark",
    overlayClassName,
    styles,
    ...restProps
  },
  ref
) {
  const { antPrefix = "ant", sparkPrefix = "spark" } = getCommonConfig();

  return (
    <AntdTooltip
      {...restProps}
      align={align}
      arrow={arrow ?? false}
      classNames={{
        ...tooltipClassNames,
        root: classNames(tooltipClassNames?.root, overlayClassName, mode === "light" && `${sparkPrefix}-tooltip-light`)
      }}
      getPopupContainer={
        getPopupContainer ??
        ((triggerNode) => triggerNode.closest(`.${antPrefix}-app`) ?? document.body)
      }
      ref={ref}
      styles={{
        ...styles,
        body: {
          maxHeight,
          overflow: "auto",
          ...styles?.body
        }
      }}
    />
  );
});

function ConfigProvider({
  children,
  className,
  iconfont = "https://at.alicdn.com/t/a/font_4807885_xobxpcpwk4i.js",
  prefix = "",
  prefixCls,
  style,
  ...restProps
}: SparkConfigProviderProps) {
  const antPrefix = prefixCls || (prefix ? `${prefix}-ant` : "ant");
  const sparkPrefix = prefix ? `${prefix}-spark` : "spark";

  useLayoutEffect(() => {
    setCommonConfig({
      antPrefix,
      configProviderProps: { ...restProps, prefixCls: antPrefix },
      iconfont,
      prefix,
      sparkPrefix
    });
  }, [antPrefix, iconfont, prefix, restProps, sparkPrefix]);

  return (
    <AntdConfigProvider {...restProps} prefixCls={antPrefix} wave={{ disabled: true }}>
      <AntdApp className={classNames("spark", className)} style={style}>
        {children}
      </AntdApp>
    </AntdConfigProvider>
  );
}

ConfigProvider.ConfigContext = AntdConfigProvider.ConfigContext;
ConfigProvider.config = AntdConfigProvider.config;
ConfigProvider.useConfig = AntdConfigProvider.useConfig;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, SparkButtonProps>(function SparkButton(
  { className, icon, iconSize, iconType, loading, style, tooltipContent, type, ...restProps },
  ref
) {
  const normalizedType: ButtonProps["type"] = type === "primaryLess" ? "primary" : type === "textCompact" ? "link" : type;
  const button = (
    <AntdButton
      {...restProps}
      className={classNames(className, "spark-button", {
        "spark-button-primaryLess": type === "primaryLess"
      })}
      icon={getSizedIcon({ icon, iconSize, iconType, size: restProps.size })}
      loading={loading}
      ref={ref}
      style={{ fontWeight: 500, lineHeight: 1, ...style }}
      type={normalizedType}
    />
  );

  return tooltipContent ? <Tooltip title={tooltipContent}>{button}</Tooltip> : button;
});

const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, SparkIconButtonProps>(function SparkIconButton(
  { bordered = true, className, icon, iconSize, iconType, style, ...restProps },
  ref
) {
  const { sparkPrefix = "spark" } = getCommonConfig();

  return (
    <Button
      className={classNames(className, `${sparkPrefix}-icon-button`)}
      icon={getSizedIcon({ icon, iconSize, iconType, size: restProps.size })}
      ref={ref}
      style={{ lineHeight: 1, ...style }}
      type={bordered ? "default" : "text"}
      {...restProps}
    />
  );
});

const carbonTheme = generateThemeByToken(carbonThemeToken);
const Tag = SparkTag;

function copy(value: string) {
  return navigator.clipboard.writeText(value);
}

export {
  Button,
  ConfigProvider,
  IconButton,
  Tag,
  Tooltip,
  carbonTheme,
  copy,
  generateTheme,
  generateThemeByToken,
  getCommonConfig,
  setCommonConfig,
  useCommonConfig
};
