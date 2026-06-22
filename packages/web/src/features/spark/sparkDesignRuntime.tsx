import carbonThemeToken from "@agentscope-ai/design/lib/antd/themes/carbonTheme.json";
import generateTheme from "@agentscope-ai/design/lib/antd/themes/generateTheme";
import generateThemeByToken from "@agentscope-ai/design/lib/antd/themes/generateThemeByToken";
import IconFont from "@agentscope-ai/design/lib/components/commonComponents/IconFont";
import SparkTag from "@agentscope-ai/design/lib/components/commonComponents/Tag";
import SparkVideo from "@agentscope-ai/design/lib/components/commonComponents/Video";
import { getCommonConfig, setCommonConfig, useCommonConfig } from "@agentscope-ai/design/lib/config";
import type { ButtonProps, ConfigProviderProps, TooltipProps } from "antd";
import {
  App as AntdApp,
  Button as AntdButton,
  ConfigProvider as AntdConfigProvider,
  Popover as AntdPopover,
  Tooltip as AntdTooltip
} from "antd";
import type { TooltipRef } from "antd/es/tooltip";
import classNames from "classnames";
import { useLayoutEffect } from "react";
import React, { forwardRef } from "react";

// 只暴露当前页面和 Spark Chat 子模块真正用到的 Spark Design API，避免加载整包副作用。
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

type CodeBlockProps = {
  className?: string;
  language: string | string[];
  readOnly?: boolean;
  theme?: "dark" | "light";
  value?: string;
};

function getSizedIcon({
  icon,
  iconSize,
  iconType,
  size
}: Pick<SparkButtonProps, "icon" | "iconSize" | "iconType" | "size">) {
  // Spark Design 支持 iconType 字符串和 React icon 两种形式，这里保留这两条路径。
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
        // AntD 5 已废弃 overlayClassName；映射到 classNames.root 保持兼容且不再报警。
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
    // Spark 子组件通过全局 commonConfig 读取 prefix 和 iconfont，这里同步最小必要配置。
    setCommonConfig({
      antPrefix,
      configProviderProps: { ...restProps, prefixCls: antPrefix },
      iconfont,
      prefix,
      sparkPrefix
    });
  }, [antPrefix, iconfont, prefix, restProps, sparkPrefix]);

  return (
    // 不使用 Spark 原始 ConfigProvider，避免其注册未用组件全局样式并触发 Emotion SSR 提示。
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
  // Spark 扩展的按钮类型最终要回落到 AntD 支持的 type。
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
    // Chat Sender 的操作按钮只依赖 IconButton 的尺寸、边框和点击行为。
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
const Popover = AntdPopover;
const Tag = SparkTag;
const Video = SparkVideo;
const CodeBlockLangExtensionsMap: Record<string, unknown[]> = {
  css: [],
  curl: [],
  go: [],
  html: [],
  java: [],
  javascript: [],
  json: [],
  jsx: [],
  markdown: [],
  php: [],
  python: [],
  yaml: []
};

function CodeBlock({ className, language, value = "" }: CodeBlockProps) {
  const lang = Array.isArray(language) ? language.join(", ") : language;

  return (
    <pre className={classNames("rounded-md bg-[#f4f4f2] p-3 text-xs leading-relaxed", className)}>
      <code data-language={lang}>{value}</code>
    </pre>
  );
}

function copy(value: string) {
  // Spark Chat 的部分动作依赖 copy 导出，统一转发到浏览器剪贴板。
  return navigator.clipboard.writeText(value);
}

export {
  Button,
  CodeBlock,
  CodeBlockLangExtensionsMap,
  ConfigProvider,
  IconButton,
  Popover,
  Tag,
  Tooltip,
  Video,
  carbonTheme,
  copy,
  generateTheme,
  generateThemeByToken,
  getCommonConfig,
  setCommonConfig,
  useCommonConfig
};
