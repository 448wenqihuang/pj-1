fetch('planets.json')
.then(data => data.json() )   
.then(json => {

  console.log(json)
  
  // sort an array of objects by comparing a nested temperature property
  // let sorted = json.sort((a,b) => a.surfaceTemperatureC.mean - b.surfaceTemperatureC.mean ); 

  // sort an array of objects by comparing sun order
  let sorted = json.sort((a,b) =>  a.orderFromSun - b.orderFromSun  ); 


  
   sorted.forEach( planet => { 

    // make a div to hold each planet
    let div = document.createElement('div') 
    div.classList.add('planet') 

    // calculate colour dynamically based on temperature. 
    const hue = (degrees) => ((464 - degrees) / 665 ) * 250 
    let h = hue(planet.surfaceTemperatureC.mean) 
    div.style.background = `hsl(${h}, 30%, 70%)`
     
    div.innerHTML = 
      `<img width="100" src="assets/${planet.name}.svg">
      <h4>${planet.name}</h4>
      <p>${planet.surfaceTemperatureC.mean}&deg;C</p>`
     
     document.querySelector('#planets') .appendChild(div)
  })
 
})

