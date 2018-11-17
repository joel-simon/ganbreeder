console.log('img=', key)
post_json('/image_children', {key}).then(data => {
    const children = document.querySelector('.image_container.content')
    const a = children.getElementsByClassName('imglink')

    console.log(document.getElementById('loading_container'))
    document.getElementById('loading_container').style.display = 'none'

    if (data.length) {
        console.assert(data.length == a.length)
        for (let i = 0; i < data.length; i++) {
            const key = data[i].key
            a[i].href = '/i?k='+key
            a[i].firstElementChild.src = root+key+'.jpeg'
        }
    } else {
        console.log('here')
    }
}).catch(err => {
    console.log(err)
})
