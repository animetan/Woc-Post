import { MessageEmbed } from 'discord.js';
import { Attachments } from './Attachments';
import { Markdown } from './Markdown';
import { Exclude } from './Handler';
export var PostType;
(function (PostType) {
    PostType["POST"] = "post";
    PostType["REPOST"] = "repost";
})(PostType || (PostType = {}));
export class Message {
    cluster;
    post = '';
    repost = '';
    embeds;
    files = [];
    constructor(cluster) {
        const { discord: { color } } = cluster;
        this.cluster = cluster;
        const embed = new MessageEmbed();
        if (color) {
            embed.setColor(color);
        }
        this.embeds = [embed];
    }
    async parsePost() {
        const { cluster, payload: { text, attachments, copy_history } } = this;
        const { VK, discord: { exclude_content } } = cluster;
        const attachmentsParser = new Attachments(cluster);
        const markdown = new Markdown(VK);
        if (text && !exclude_content.includes(Exclude.TEXT)) {
            this.post += `${await markdown.fix(text)}\n`;
        }
        if (attachments && !exclude_content.includes(Exclude.ATTACHMENTS)) {
            const parsedAttachments = attachmentsParser.parse(attachments, this.embeds, this.files);
            this.attach(parsedAttachments, PostType.POST);
        }
        const repost = copy_history ? copy_history[0] : null;
        if (repost && !exclude_content.includes(Exclude.REPOST_TEXT) && !exclude_content.includes(Exclude.REPOST_ATTACHMENTS)) {
            const { text, from_id, id, attachments } = repost;
            this.repost += `\n>>> [**Репост записи**](https://vk.com/wall${from_id}_${id})`;
            if (text && !exclude_content.includes(Exclude.REPOST_TEXT)) {
                this.repost += `\n\n${await markdown.fix(text)}`;
            }
            if (attachments && !exclude_content.includes(Exclude.REPOST_ATTACHMENTS)) {
                const parsedAttachments = attachmentsParser.parse(attachments, this.embeds, this.files);
                this.attach(parsedAttachments, PostType.REPOST);
            }
        }
        this.sliceMessage();
    }
    attach(attachmentFields, type) {
        const { embeds: [embed] } = this;
        switch (type) {
            case PostType.POST:
                attachmentFields = attachmentFields.slice(0, 24);
                attachmentFields.forEach((attachmentField, index) => {
                    embed.addField(!index ? 'Вложения' : '⠀', attachmentField);
                });
                break;
            case PostType.REPOST:
                if (embed.fields.length) {
                    attachmentFields = attachmentFields.slice(0, (embed.fields.length ? 12 : 25) - 1);
                    embed.spliceFields(-1, embed.fields.length >= 25 ?
                        12
                        :
                            0);
                }
                attachmentFields.forEach((attachmentField, index) => {
                    embed.addField(!index ? 'Вложения репоста' : '⠀', attachmentField);
                });
                break;
        }
    }
    sliceMessage() {
        const { post, repost } = this;
        if ((post + repost).length > 4096) {
            if (post) {
                this.post = Message.sliceFix(`${post.slice(0, (repost ? 2048 : 4096) - 3)}…\n`);
            }
            if (repost) {
                this.repost = Message.sliceFix(`${repost.slice(0, (post ? 2048 : 4096) - 1)}…`);
            }
        }
    }
    static sliceFix(text) {
        return text.replace(/\[([^\])]+)?]?\(?([^()\][]+)?…/g, '$1…');
    }
}
