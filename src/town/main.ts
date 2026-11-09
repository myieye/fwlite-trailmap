import { mount } from 'svelte'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/figtree/wght.css'
import './town.css'
import Town from './Town.svelte'

export default mount(Town, { target: document.getElementById('app')! })
