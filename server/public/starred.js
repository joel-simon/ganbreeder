const image_container = document.getElementsByClassName('image_container')[0]

/* [key, date] pairs. */
const starred = Object.entries(localStorage)

/* Sort entires by date starred.*/
starred.sort((a, b) => b[1]-a[1])

for (const [key, time] of starred) {
    const a = document.createElement('a')
    a.href = '/i?k='+key

    const img = document.createElement('img')
    img.src = root+key+'.jpeg'

    a.appendChild(img)
    image_container.appendChild(a)
}