import { Sender } from './Sender';
import { Storage } from './Storage';
import { VK, TokenType } from './VK';
import { getById, getPostAuthor, getPostLink, getResourceId } from '../utils';
export var Exclude;
(function (Exclude) {
    Exclude["TEXT"] = "text";
    Exclude["ATTACHMENTS"] = "attachments";
    Exclude["REPOST_TEXT"] = "repost_text";
    Exclude["REPOST_ATTACHMENTS"] = "repost_attachments";
})(Exclude || (Exclude = {}));
export class Handler {
    cluster;
    VK;
    storage;
    constructor(cluster) {
        this.cluster = cluster;
        const vk = new VK({
            token: cluster.vk.token,
            apiMode: 'parallel'
        });
        this.VK = vk;
        this.storage = new Storage({
            vk
        });
    }
    async init() {
        const { api } = this.VK;
        const [users, groups] = await Promise.allSettled([
            api.users.get({}),
            api.groups.getById({})
        ])
            .then((results) => results.map(({ status, ...rest }) => (status === 'fulfilled' && 'value' in rest ?
            rest.value
            :
                null)));
        if (users?.length) {
            const [{ id }] = users;
            this.VK.setTokenType(TokenType.USER);
            this.storage.setPrefix(String(id));
            this.startInterval();
        }
        else if (groups?.length) {
            const [{ id }] = groups;
            this.cluster.vk.longpoll = true;
            this.VK.setTokenType(TokenType.GROUP);
            this.storage.setPrefix(`-${id}`);
            this.startPolling();
        }
        else {
            this.storage.setPrefix(this.cluster.vk.token);
        }
        return this;
    }
    startInterval() {
        const { index, vk: { interval, group_id, filter }, discord: { author, copyright, date } } = this.cluster;
        console.log(`[VK2Discord] Кластер #${index} будет проверять новые записи с интервалом в ${interval} секунд.`);
        if (interval < 20) {
            console.warn('[!] Не рекомендуем ставить интервал получения постов меньше 20 секунд, во избежания лимитов ВКонтакте!');
        }
        setInterval(async () => {
            const id = await getResourceId(this.VK, group_id)
                .then((id) => {
                if (!id) {
                    return console.error(`[!] ${group_id} не является ID-пользователя или группы ВКонтакте!`);
                }
                return id;
            });
            if (!id) {
                return;
            }
            this.VK.api.wall.get({
                owner_id: id,
                count: 2,
                extended: 1,
                filter: filter ? 'owner' : 'all',
                v: '5.131'
            })
                .then(async ({ groups, profiles, items }) => {
                if (items.length) {
                    // Проверяем наличие закрепа, если он есть берем свежую запись
                    const payload = (items.length === 2 && Number(items[0].date) < Number(items[1].date) ?
                        items[1]
                        :
                            items[0]);
                    const sender = this.createSender(payload);
                    const [embed] = sender.embeds;
                    if (date) {
                        embed.setTimestamp(payload.date * 1_000);
                    }
                    if (author) {
                        const postAuthor = getPostAuthor(payload, profiles, groups);
                        if (postAuthor) {
                            const { name, photo_50 } = postAuthor;
                            embed.setAuthor(name, photo_50, getPostLink(payload));
                        }
                    }
                    if (copyright) {
                        await this.setCopyright(payload, embed);
                    }
                    return sender.handle();
                }
                console.log(`[!] В кластере #${index} не получено ни одной записи. Проверьте наличие записей в группе или измените значение фильтра в конфигурации.`);
            })
                .catch((error) => {
                console.error(`[!] Произошла ошибка при получении записей ВКонтакте в кластере #${index}:`);
                console.error(error);
            });
        }, interval * 1000);
    }
    startPolling() {
        const { index, discord: { author, copyright, date } } = this.cluster;
        this.VK.updates.on('wall_post_new', async (context) => {
            const payload = context['payload'];
            if (payload.post_type === 'post') {
                const sender = this.createSender(payload);
                const [embed] = sender.embeds;
                if (date) {
                    embed.setTimestamp(payload.date * 1_000);
                }
                if (author) {
                    const postAuthor = await getById(this.VK.api, payload.from_id);
                    if (postAuthor) {
                        const { photo_50, name } = postAuthor;
                        embed.setAuthor(name, photo_50, getPostLink(payload));
                    }
                }
                if (copyright) {
                    await this.setCopyright(payload, embed);
                }
                return sender.handle();
            }
        });
        this.VK.updates.start()
            .then(() => console.log(`[VK2Discord] Кластер #${index} подключен к ВКонтакте с использованием LongPoll!`))
            .catch((error) => {
            console.error(`[!] Произошла ошибка при подключении к LongPoll ВКонтакте в кластере #${index}:`);
            console.error(error);
        });
    }
    createSender(payload) {
        const { cluster, VK, storage } = this;
        return new Sender({
            ...cluster,
            VK,
            storage
        }, payload);
    }
    async setCopyright({ copyright, signer_id }, embed) {
        if (signer_id) {
            const user = await getById(this.VK.api, signer_id);
            embed.setFooter(user?.name, user?.photo_50);
        }
        if (copyright) {
            const group = await getById(this.VK.api, copyright.id);
            embed.setFooter(`${embed.footer?.text ? `${embed.footer.text} • ` : ''}Источник: ${copyright.name}`, embed.footer?.iconURL || group?.photo_50);
        }
    }
}
