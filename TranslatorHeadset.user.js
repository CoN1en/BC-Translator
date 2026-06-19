// ==UserScript==
// @name         BC Translator Headset
// @namespace    BC
// @version      2.0
// @description  Translator Headset for BC/BCX
// @match https://*.bondageprojects.elementfx.com/R*/*
// @match https://*.bondage-europe.com/R*/*
// @match https://*.bondageprojects.com/R*/*
// @match https://*.bondage-asia.com/club/R*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // 脚本启动提示
    console.log("[Translator Headset] Loaded");

    /**
     * 已处理消息缓存
     *
     * 保存 msgid
     * 防止同一条消息被重复翻译
     */
    const translated = new Set();

    /**
     * 检测玩家是否佩戴翻译耳机
     *
     * 条件：
     * ItemEars = FuturisticEarphones
     * Craft.Name = Translator Headset
     *
     * 返回：
     * true  = 启用翻译
     * false = 禁用翻译
     */
    function hasTranslatorHeadset() {

        try {

            // 获取耳部装备
            const ears =
                InventoryGet(Player, "ItemEars");

            if (!ears)
                return false;

            return (

                // 必须是未来耳机
                ears.Asset?.Name === "FuturisticEarphones"

                &&

                // 必须是你制作的翻译耳机
                ears.Craft?.Name === "Translator Headset"
            );

        } catch {

            return false;
        }
    }

    /**
     * 判断文本是否包含中文
     *
     * 中文：
     *     翻译成英文
     *
     * 英文：
     *     翻译成中文
     */
    function isChinese(text) {

        return /[\u4e00-\u9fff]/.test(text);
    }

    /**
     * Google Translate
     *
     * text   = 原文
     * target = 目标语言
     */
    async function translate(text, target) {

        const url =
            "https://translate.googleapis.com/translate_a/single" +
            "?client=gtx" +
            "&sl=auto" +
            "&tl=" + target +
            "&dt=t" +
            "&q=" + encodeURIComponent(text);

        const response = await fetch(url);
        const data = await response.json();

        return data[0]
            .map(x => x[0])
            .join("");
    }

    /**
     * 处理单条聊天消息
     */
    async function processMessage(message) {

        // 没戴翻译耳机
        // 不进行翻译
        if (!hasTranslatorHeadset())
            return;

        // 聊天内容节点
        const content =
            message.querySelector(
                ".chat-room-message-content"
            );

        if (!content)
            return;

        /**
         * BC消息唯一ID
         *
         * 例如：
         * hjd6ctnk58
         * 96aap2r8rk
         */
        const msgid =
            content.getAttribute("msgid");

        if (!msgid)
            return;

        // 已翻译过
        if (translated.has(msgid))
            return;

        translated.add(msgid);

        /**
         * WCE反混淆文本
         *
         * 示例：
         *
         * 你呜好
         * [你们好]
         *
         * 这里读取：
         * [你们好]
         */
        const original =
            message.querySelector(
                ".chat-room-message-original"
            );

        let text;

        if (original) {

            // 去掉[]
            text = original.textContent
                .replace(/^\[/, "")
                .replace(/\]$/, "")
                .trim();

        } else {

            /**
             * 普通消息
             *
             * 示例：
             * 你好
             * Hello
             */
            text = content.textContent.trim();
        }

        if (!text)
            return;

        /**
         * 防止翻译自己的翻译结果
         *
         * 例如：
         * 【EN】Hello
         * 【CN】你好
         */
        if (
            text.startsWith("【EN】") ||
            text.startsWith("【CN】")
        ) {
            return;
        }

        try {

            /**
             * 自动判断翻译方向
             *
             * 中文 → 英文
             * 英文 → 中文
             */
            const target =
                isChinese(text)
                    ? "en"
                    : "zh-CN";

            // 调用Google翻译
            const result =
                await translate(text, target);

            if (!result)
                return;

            /**
             * 创建翻译显示区域
             */
            const translation =
                document.createElement("div");

            translation.className =
                "translator-headset-result";

            /**
             * 显示样式
             */
            translation.style.marginLeft = "20px";
            translation.style.opacity = "0.85";
            translation.style.fontStyle = "italic";
            translation.style.color = "#7ecbff";
            translation.style.userSelect = "text";

            /**
             * 翻译标签
             */
            translation.textContent =
                isChinese(text)
                    ? `【EN】${result}`
                    : `【CN】${result}`;

            /**
             * 插入到聊天消息下面
             */
            message.appendChild(
                translation
            );

        } catch (err) {

            console.error(
                "[Translator Headset]",
                err
            );
        }
    }

    /**
     * 扫描所有聊天消息
     */
    function scanMessages() {

        document
            .querySelectorAll(
                ".ChatMessage.ChatMessageChat"
            )
            .forEach(processMessage);
    }

    /**
     * 监听聊天室DOM变化
     *
     * 新消息出现时自动扫描
     */
    const observer =
        new MutationObserver(() => {

            if (
                hasTranslatorHeadset()
            ) {
                scanMessages();
            }

        });

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

    /**
     * 脚本启动时扫描一次
     */
    scanMessages();

    /**
     * 安全扫描
     *
     * 防止BCX/BCE/WCE修改DOM
     * 导致MutationObserver漏掉消息
     *
     * 每2秒补扫一次
     */
    setInterval(() => {

        if (
            hasTranslatorHeadset()
        ) {

            scanMessages();
        }

    }, 2000);

})();