import { VK as _VK, resolveResource } from 'vk-io';
export var TokenType;
(function (TokenType) {
    TokenType["USER"] = "user";
    TokenType["GROUP"] = "group";
    TokenType["SERVICE"] = "service";
})(TokenType || (TokenType = {}));
export class VK extends _VK {
    tokenType = TokenType.SERVICE;
    resolveResource(resource) {
        return resolveResource({
            resource,
            api: this.api
        });
    }
    setTokenType(type) {
        this.tokenType = type;
    }
}
