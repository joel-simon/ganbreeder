
function post_json(path, data) {
    return post(path, data).then((response) => {
        return response.json()
    })
}

function post(path, data) {
    return window.fetch(path, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
    });
}
