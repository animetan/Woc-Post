export function getPostAuthor(post, profiles, groups) {
    const author = post.from_id > 0 ?
        profiles.filter(({ id }) => id === post.from_id)
        :
            groups.filter(({ id }) => id === Math.abs(post.from_id));
    return author.map((profile) => {
        const { name, photo_50, first_name, last_name } = profile;
        if (name) {
            return profile;
        }
        else {
            return {
                name: `${first_name} ${last_name}`,
                photo_50
            };
        }
    })[0];
}
