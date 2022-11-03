import { Server as IOServer } from "socket.io";
const io = new IOServer();

export function numerosRandom (cant) {
    let numeros = [];
    let objetoNumeros = {};
    const cantidad = 1000;
    const cantNumerosRandom = 10;
    if (cant) {
        cantidad = cant
    }

    // Armando array de numeros con numeros random y la cantidad de veces que salen
    for (let i = 1; i < cantidad; i++) {
        let random = Math.floor(Math.random()*cantNumerosRandom+1)
        if (!numeros[random]) {
            numeros[random] = 1
        } else {
            numeros[random]++
        }
    }

    // Agregando valor 0 en el array a aquellos numeros que no salieron
    for (let i = 1; i < numeros.length; i++) {
        if (numeros[i] === undefined) {
            numeros[i] = 0
        }
    }

    // Armando el objeto con las claves
    for (let i = 1; i <= cantNumerosRandom; i++) {
        let clave = i;
        objetoNumeros[clave] = 0
    }

    // Otorgando valor (cantidad de veces que sale un numero) a las claves del objeto a devolver
    for (let i = 1; i < numeros.length; i++) {
        let clave = i;
        objetoNumeros[clave] = numeros[i]
    }

    return objetoNumeros
}

let contador = 0;

process.on('message', msg => {
    console.log('enviado desde principal:')
    console.log(msg)
    process.send()

    //io.sockets.emit()
})