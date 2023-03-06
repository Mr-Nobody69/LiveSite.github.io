'use strict';

// Implementing the ❗parent class (wiil take in the data that is common to both workouts)
class Workout {
  // id & dates are fields, then coords, distance, duration are defined in the constructor method
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng] -> array of lat & lng
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// Implementing ❗child classes
class Running extends Workout {
  // constructor takes in the same data as the parent cls PLUS the additional properties that we wanna set on the Running object
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    // we call the super with the first 3 that are common to the parent cls
    super(coords, distance, duration); // will initialize the 'this' KW
    this.cadence = cadence;
    // We CAN call ANY code in the constr; instead of relying on "return this.pace", we can call calcPace() method here in the constr. We use the constr to IMMEDIATELLY calculate the pace. Same for speed with calcSpeed().
    this.calcPace();
    this._setDescription();
  }
  // Method for calculating the pase
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance; // adding a new property
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling'; // we define a field, so type is gonna be a property available on all the instances

  constructor(coords, distance, duration, elevationGain) {
    // we call the super with the first 3 that are common to the parent cls
    super(coords, distance, duration); // will initialize the 'this' KW
    this.elevationGain = elevationGain;
    // this.type = 'cycling' // same as type = 'cycling' from R38🔴
    this.calcSpeed(); // the 'after' return is not necessary cos we call HERE this method
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// // ❗Experiments: creating 'run' & 'cycling'❗
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 500);

///////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map; // because of #, these 4 classfields will become private instance properties, present on all instances created through this class
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);

    // Move to marker on click (L241-01'00") - first we do NOT have the element on which we want to attach the event listener because it hasen NOT been created yet; so we have to do event delegation (add the event handler to the parent element in the ❗constructor()❗ so that eventhandler is added at the beginning🔴)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; // ❗destructuring❗
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //❗'map' must be === id in html❗
    //   console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Helper functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // come as string, so we convert them to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; // create lat & lng variables based on 'latlng' object
    let workout;

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid (using guard-clause -L239-12'53"-)
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      // Create running object
      workout = new Running([lat, lng], distance, duration, cadence); //using data from 'const { lat, lng }=...'
    }

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords) //🔴original marker🔴
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // ❗❗❗using the public inteface (with click() method). Is permanently commented cos otherwise will throw an error caused by the fact that object comming from local storage will NOT inherit all the method (and the prototype chain) that they had before❗❗❗
    // workout.click();
  }

  // ❗Set all workouts to local storage❗ (use it ONLY 4 small amounts of data)(in browser) L242-03'00"🔴
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // 🔴JSON.parse() is the opposite of JSON.stringify()🔴
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // app.reset() in console
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App(); // the app object is created right in the beginning when the page loads SO the constructor() is also executed immediately as the page loads
// app._getPosition(); // In order to trigger the geolocation API, _getPosition() methond needs to be called. Works if is here(all the code that is here in the top level scope -outside of any function- will get executed immediately as the script loads); In the beginning this new app variable is created out of the class and then immediately afterwards we would get the position of the user, but is cleaner to be in the class. Inside the App class we have a method that automatically gets called as the page loads: constructor(), SO we can get the position in the constructor()
// app._getPosition() must be changed to the 'this' KW, to the current object => this._getPosition();
