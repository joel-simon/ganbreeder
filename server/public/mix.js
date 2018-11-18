const form = document.querySelector('form.mixinput')
const loading_container = document.getElementById('loading_container')
const image_container = document.querySelector('.image_container.content')
const imglinks = image_container.getElementsByClassName('imglink')
const textinput = document.querySelectorAll('input[type=text]')
const inputimgs = document.querySelectorAll('img.parent')

const get_key = (url) => new URLSearchParams(new URL(url).search).get('k')

function oninput(i) {
    inputimgs[i].style.visibility = 'hidden'
    try {
        const key = get_key(textinput[i].value)
        inputimgs[i].src = root+key+'.jpeg'
        inputimgs[i].onload = () => inputimgs[i].style.visibility = ''
    } catch (e) { }
}

const query = new URLSearchParams(window.location.search)
if (query.has('parent1')) {
    const url = window.location.origin + '/i?k=' + query.get('parent1')
    textinput[0].value = url
}

for (let i = 0; i < textinput.length; i++) {
    oninput(i)
    textinput[i].oninput = () => oninput(i)
    textinput[i].onpaste = () => oninput(i)
}

form.addEventListener('submit', event => {
    event.preventDefault()
    const parent1 = form.querySelector('.parent1').value
    const parent2 = form.querySelector('.parent2').value
    let key1, key2
    try {
        key1 = get_key(parent1)
        key2 = get_key(parent2)
    } catch(e) {
        alert('URL not valid.')
        console.log(e)
        return
    }
    loading_container.style.display = ''
    post_json('/mix_images', { key1, key2 }).then(data => {
        loading_container.style.display = 'none'
        image_container.style.display = ''
        data = data.reverse()
        for (let i = 0; i < data.length; i++) {
            const key = data[i].key
            imglinks[i].href = '/i?k='+key
            imglinks[i].firstElementChild.src = root+key+'.jpeg'
        }
    }).catch(err => {
        console.log(err)
        alert('There was an error :\'(')
    })
})
