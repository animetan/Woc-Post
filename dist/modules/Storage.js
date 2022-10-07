import { TokenType } from './VK';
export var FieldType;
(function (FieldType) {
    FieldType["ARRAY_NUMBER"] = "array_number";
    FieldType["NUMBER"] = "number";
})(FieldType || (FieldType = {}));
export class Storage {
    static cache = new Map();
    static ARRAY_ITEMS_SEPARATOR = ',';
    static PREFIX = 'vk2d-';
    vk;
    prefix;
    constructor({ vk, prefix }) {
        this.vk = vk;
        if (prefix) {
            this.prefix = prefix;
        }
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
    get(key, type) {
        const cachedKey = this.buildCacheKey(key);
        const cachedValue = Storage.cache.get(cachedKey);
        if (cachedValue) {
            return Promise.resolve(cachedValue);
        }
        return this.vk.api.storage.get({
            key: this.buildPrefixedKey(key),
            user_id: this.userId
        })
            .then((values) => {
            const [{ value }] = values;
            switch (type) {
                case FieldType.ARRAY_NUMBER: {
                    const values = value.split(Storage.ARRAY_ITEMS_SEPARATOR);
                    switch (type) {
                        case FieldType.ARRAY_NUMBER:
                            return values.map(Number);
                    }
                    break;
                }
                case FieldType.NUMBER:
                    return Number(value);
                default:
                    return value;
            }
        });
    }
    set(key, value) {
        if (key.startsWith(Storage.PREFIX)) {
            key = key.replace(Storage.PREFIX, '');
        }
        const cachedKey = this.buildCacheKey(key);
        Storage.cache.set(cachedKey, value);
        if (value !== undefined) {
            if (Array.isArray(value)) {
                value = value.join(Storage.ARRAY_ITEMS_SEPARATOR);
            }
            else {
                value = String(value);
            }
        }
        return this.vk.api.storage.set({
            key: this.buildPrefixedKey(key),
            user_id: this.userId,
            value
        })
            .then();
    }
    getKeys() {
        return this.vk.api.storage.getKeys({
            user_id: this.userId,
            count: 1_000
        });
    }
    get userId() {
        return this.vk.tokenType !== TokenType.USER ?
            1
            :
                undefined;
    }
    buildCacheKey(key) {
        return `${this.prefix}-${key}`;
    }
    buildPrefixedKey(key) {
        return `${Storage.PREFIX}${key}`;
    }
}
