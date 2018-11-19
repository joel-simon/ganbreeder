const image_container = document.getElementsByClassName('image_container')[0]

for (const key of Object.keys(localStorage)) {
    image_container.append()
    const a = document.createElement('a')
    a.href = '/i?k='+key

    const img = document.createElement('img')
    img.src = root+key+'.jpeg'

    a.appendChild(img)
    image_container.appendChild(a)
}