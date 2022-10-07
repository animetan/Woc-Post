export function getById(api, id) {
    return id ?
        id > 0 ?
            api.users.get({
                user_ids: String(id),
                fields: ['photo_50']
            })
                .then(([{ first_name, last_name, photo_50 }]) => ({
                name: `${first_name} ${last_name}`,
                photo_50
            }))
            :
                api.groups.getById({
                    group_id: String(Math.abs(id))
                })
                    .then(([group]) => group)
        :
            Promise.resolve(null);
}
