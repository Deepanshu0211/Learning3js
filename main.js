import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

class CarGame {
  constructor() {
    this.canvas = document.querySelector('#webgl');
    
    this.model = null;
    this.initialPosition = new THREE.Vector3(10, 0, 0);
    this.initialRotation = new THREE.Euler(0, 0, 0);
    this.speed = 0;
    this.acceleration = 0;
    this.steering = 0;
    this.lastTime = 0;
    this.keys = { W: false, A: false, S: false, D: false, Space: false };
    this.debug = { showStats: false, wireframe: false };
    
    this.physics = {
      engineForce: 3000,
      brakeForce: 4500,
      maxReverseSpeed: -15,
      dragCoefficient: 0.4,
      rollingResistance: 12,
      wheelRadius: 0.35,
      steeringClamp: 0.45,
      steeringStep: 0.04,
      maxSteer: Math.PI / 4, // 45 degrees
      weight: 1500, // kg
      gearRatio: [3.67, 2.10, 1.36, 1.03, 0.84],
      currentGear: 1,
      engineRPM: 1000,
      maxRPM: 6500,
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      suspensionTravel: 0.2,
      wheelDamping: 2.3,
      axleTrack: 1.7,
      wheelBase: 2.6,
      aeroDrag: 2.5,
      aeroLift: 2.0,
      torqueCurve: [
        [0, 0],
        [1500, 280],
        [4500, 420],
        [6500, 390]
      ],
      slipAngle: 0.15,
      tireGrip: 2.2
    };

    this.carState = {
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      engineTorque: 0,
      brakeTorque: 0,
      steering: 0,
      wheelAngles: [0, 0, 0, 0],
      suspensionLengths: new Array(4).fill(this.physics.suspensionRestLength),
      wheelForces: new Array(4).fill(new THREE.Vector3()),
      localVelocity: new THREE.Vector3(),
      slipRatios: new Array(4).fill(0),
      slipAngles: new Array(4).fill(0),
      tireForces: new Array(4).fill(new THREE.Vector3())
    };
  

    
    this.portfolioText = {
      text: "MY PORTFOLIO",
      size: 5,
      height: 0.5,
      position: new THREE.Vector3(0, 0.1, 0),
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
      color: 0x1e88e5,
      isCard: false,
      proximityThreshold: 15,
      transitionSpeed: 0.05
    };
    
    this.init();
  }
  
  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.loadCar();
    this.createGround();
    this.createPortfolioText();
    this.createControls();
    this.setupEventListeners();
    this.animate();
  }
  
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);
  }
  
  createCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 30);
    this.scene.add(this.camera);
    
    this.cameraHelper = new THREE.CameraHelper(this.camera);
    this.cameraHelper.visible = false;
    this.scene.add(this.cameraHelper);
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87ceeb);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }
  
  createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x1a8f3c, 0.3);
    this.scene.add(hemisphereLight);
    
    this.lightHelper = new THREE.DirectionalLightHelper(this.sunLight, 5);
    this.lightHelper.visible = false;
    this.scene.add(this.lightHelper);
  }
  
  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
    groundGeometry.rotateX(-Math.PI / 2);
    
    const groundTexture = new THREE.TextureLoader().load('/textures/grass.png', (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(100, 100);
    });
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a8f3c,
      map: groundTexture,
      wireframe: this.debug.wireframe,
      roughness: 0.8,
      metalness: 0.2
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    
    this.gridHelper = new THREE.GridHelper(100, 20, 0x000000, 0x000000);
    this.gridHelper.position.y = 0.01;
    this.gridHelper.visible = this.debug.showStats;
    this.scene.add(this.gridHelper);
  }
  
  createPortfolioText() {
    const fontLoader = new FontLoader();
    
    fontLoader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      const textGeometry = new TextGeometry(this.portfolioText.text, {
        font: font,
        size: this.portfolioText.size,
        height: this.portfolioText.height,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
      });
      
      textGeometry.center();
      
      const textMaterial = new THREE.MeshStandardMaterial({
        color: this.portfolioText.color,
        metalness: 0.3,
        roughness: 0.4
      });
      
      this.portfolioTextMesh = new THREE.Mesh(textGeometry, textMaterial);
      this.portfolioTextMesh.position.copy(this.portfolioText.position);
      this.portfolioTextMesh.rotation.copy(this.portfolioText.rotation);
      this.portfolioTextMesh.castShadow = true;
      this.portfolioTextMesh.receiveShadow = true;
      
      this.scene.add(this.portfolioTextMesh);
      
      const spotLight = new THREE.SpotLight(0xffffff, 1);
      spotLight.position.set(0, 10, 0);
      spotLight.angle = Math.PI / 6;
      spotLight.penumbra = 0.2;
      spotLight.decay = 2;
      spotLight.distance = 50;
      
      spotLight.target = this.portfolioTextMesh;
      spotLight.castShadow = true;
      
      this.scene.add(spotLight);
      
      const cardFrontMaterial = new THREE.MeshStandardMaterial({
        color: this.portfolioText.color,
        metalness: 0.5,
        roughness: 0.3,
        side: THREE.DoubleSide
      });
      
      const cardBackMaterial = new THREE.MeshStandardMaterial({
        color: 0x012a4a,
        metalness: 0.3,
        roughness: 0.5,
        side: THREE.DoubleSide
      });
      
      const cardGeometry = new THREE.PlaneGeometry(10, 7);
      
      this.portfolioCardMesh = new THREE.Mesh(cardGeometry, cardFrontMaterial);
      this.portfolioCardMesh.position.copy(this.portfolioText.position);
      this.portfolioCardMesh.position.y += 1;
      this.portfolioCardMesh.rotation.x = -Math.PI / 2 + Math.PI / 12;
      this.portfolioCardMesh.castShadow = true;
      this.portfolioCardMesh.receiveShadow = true;
      this.portfolioCardMesh.visible = false;
      
      this.scene.add(this.portfolioCardMesh);
      
      this.cardBackMesh = new THREE.Mesh(cardGeometry, cardBackMaterial);
      this.cardBackMesh.position.copy(this.portfolioCardMesh.position);
      this.cardBackMesh.position.y -= 0.01;
      this.cardBackMesh.rotation.copy(this.portfolioCardMesh.rotation);
      this.cardBackMesh.rotation.y = Math.PI;
      this.cardBackMesh.castShadow = true;
      this.cardBackMesh.visible = false;
      
      this.scene.add(this.cardBackMesh);
      
      this.createCardContent();
    });
  }
  
  createCardContent() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(0, 0, canvas.width, 80);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MY PORTFOLIO', canvas.width / 2, 50);
    
    ctx.fillStyle = '#012a4a';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Projects', 30, 120);
    
    ctx.font = '24px Arial';
    ctx.fillText('• 3D Car Game Development', 50, 160);
    ctx.fillText('• Web Applications', 50, 195);
    ctx.fillText('• Mobile Development', 50, 230);
    
    ctx.font = 'bold 30px Arial';
    ctx.fillText('Skills', 30, 280);
    
    ctx.font = '24px Arial';
    ctx.fillText('• JavaScript / Three.js', 50, 320);
    ctx.fillText('• 3D Modeling & Animation', 50, 355);
    ctx.fillText('• Game Physics & Mechanics', 50, 390);
    
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Click to view full portfolio', canvas.width / 2, 460);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    if (this.portfolioCardMesh) {
      this.portfolioCardMesh.material.map = texture;
      this.portfolioCardMesh.material.needsUpdate = true;
    }
  }
  
  loadCar() {
    const loadingManager = new THREE.LoadingManager();
    const loader = new GLTFLoader(loadingManager);
    
    loader.load('/models/scene.gltf', (gltf) => {
      this.model = gltf.scene;
      
      this.model.position.copy(this.initialPosition);
      this.model.rotation.copy(this.initialRotation);
      this.model.scale.set(50, 50, 50);
      
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.envMapIntensity = 0.8;
            child.material.needsUpdate = true;
          }
        }
      });
      
      this.carRoot = new THREE.Object3D();
      this.scene.add(this.carRoot);
      this.carRoot.add(this.model);
      
      // Fix: Reset model position relative to carRoot
      this.model.position.set(0, 0, 0);
      this.carRoot.position.copy(this.initialPosition);
      this.carRoot.rotation.copy(this.initialRotation);
      
      const carBox = new THREE.Box3().setFromObject(this.model);
      const carSize = carBox.getSize(new THREE.Vector3());
      
      const boxGeometry = new THREE.BoxGeometry(carSize.x * 0.9, carSize.y * 0.9, carSize.z * 0.9);
      
      // Fix: Properly align hitbox with the car
      this.carHitboxMesh = new THREE.Mesh(
        boxGeometry,
        new THREE.MeshBasicMaterial({ 
          color: 0xff0000, 
          wireframe: true, 
          transparent: true, 
          opacity: 0.5 
        })
      );
      
      const center = new THREE.Vector3();
      carBox.getCenter(center);
      
      // Fix: Position hitbox at the center of the car model
      this.carHitboxMesh.position.copy(center.sub(this.carRoot.position));
      this.carHitboxMesh.visible = false;
      this.carRoot.add(this.carHitboxMesh);
    });
  }
  
  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }
  
  setupEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('resize', () => this.handleResize());
    
    window.addEventListener('click', () => {
      if (this.portfolioText.isCard) {
        this.animateCardClick();
      }
    });
  }
  
  animateCardClick() {
    if (!this.portfolioCardMesh) return;
    
    const duration = 0.5;
    const startRotation = this.portfolioCardMesh.rotation.y;
    const targetRotation = startRotation + Math.PI * 2;
    let startTime = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        this.portfolioCardMesh.rotation.y = startRotation + (targetRotation - startRotation) * progress;
        
        requestAnimationFrame(animate);
      } else {
        this.portfolioCardMesh.rotation.y = startRotation;
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  handleKeyDown(e) {
    if (e.key.toLowerCase() === 's') this.keys.S = true;
    if (e.key.toLowerCase() === 'a') this.keys.A = true;
    if (e.key.toLowerCase() === 'w') this.keys.W = true;
    if (e.key.toLowerCase() === 'd') this.keys.D = true;
    if (e.key === ' ') this.keys.Space = true;
    
    if (e.key.toLowerCase() === 'r') this.resetCar();
    if (e.key.toLowerCase() === 'h') this.toggleDebugMode();
    if (e.key.toLowerCase() === 'c') this.toggleCameraMode();
  }
  
  handleKeyUp(e) {
    if (e.key.toLowerCase() === 's') this.keys.S = false;
    if (e.key.toLowerCase() === 'a') this.keys.A = false;
    if (e.key.toLowerCase() === 'w') this.keys.W = false;
    if (e.key.toLowerCase() === 'd') this.keys.D = false;
    if (e.key === ' ') this.keys.Space = false;
  }
  
  resetCar() {
    if (this.carRoot) {
      this.carRoot.position.copy(this.initialPosition);
      this.carRoot.rotation.copy(this.initialRotation);
      this.speed = 0;
      this.acceleration = 0;
      this.steering = 0;
    }
  }
  
  toggleDebugMode() {
    this.debug.showStats = !this.debug.showStats;
    this.debug.wireframe = !this.debug.wireframe;
    
    if (this.lightHelper) this.lightHelper.visible = this.debug.showStats;
    if (this.cameraHelper) this.cameraHelper.visible = this.debug.showStats;
    if (this.carHitboxMesh) this.carHitboxMesh.visible = this.debug.showStats;
    if (this.gridHelper) this.gridHelper.visible = this.debug.showStats;
    
    if (this.ground) {
      this.ground.material.wireframe = this.debug.wireframe;
    }
  }
  
  toggleCameraMode() {
    this.controls.enabled = !this.controls.enabled;
  }
  
  handleResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
  
  // Key fixes in the updateCarPhysics method:
updateCarPhysics(deltaTime) {
  if (!this.carRoot) return;

  // Convert key states to physical inputs
  const throttleInput = this.keys.W ? 1 : 0;
  const brakeInput = this.keys.S || this.keys.Space ? 1 : 0;

  // Calculate engine torque based on RPM and throttle
  const torquePoints = this.physics.torqueCurve;
  let engineTorque = 0;
  for (let i = 0; i < torquePoints.length - 1; i++) {
    if (this.physics.engineRPM >= torquePoints[i][0] && 
        this.physics.engineRPM <= torquePoints[i + 1][0]) {
      const t = (this.physics.engineRPM - torquePoints[i][0]) / 
               (torquePoints[i + 1][0] - torquePoints[i][0]);
      engineTorque = THREE.MathUtils.lerp(torquePoints[i][1], torquePoints[i + 1][1], t);
      break;
    }
  }
  
  // Apply throttle and braking forces
  const effectiveTorque = engineTorque * throttleInput;
  const brakeForce = this.physics.brakeForce * brakeInput;

  // Transmission system with gear ratios
  const effectiveGearRatio = this.physics.gearRatio[this.physics.currentGear - 1];
  const wheelTorque = (effectiveTorque - brakeForce) * effectiveGearRatio;
  const wheelForce = wheelTorque / this.physics.wheelRadius;

  // Enhanced weight transfer calculation
  const latAccel = this.carState.velocity.x * deltaTime;
  const longAccel = this.carState.velocity.z * deltaTime;
  const totalWeight = this.physics.weight * 9.81;
  
  // Dynamic weight distribution based on acceleration
  const frontWeight = totalWeight * 0.55 - 
    (longAccel * this.physics.weight * 0.3) / 
    this.physics.wheelBase;
  
  const rearWeight = totalWeight - frontWeight;
  const leftWeight = totalWeight * 0.5 - 
    (latAccel * this.physics.weight * 0.3) / 
    this.physics.axleTrack;

 
  const suspensionForces = [];
  for (let i = 0; i < 4; i++) {
    const compression = THREE.MathUtils.clamp(
      this.physics.suspensionRestLength - this.carState.suspensionLengths[i],
      0,
      this.physics.suspensionTravel
    );
    
    const suspensionForce = this.physics.suspensionStiffness * compression - 
      this.physics.wheelDamping * this.carState.wheelForces[i].y;
    
    suspensionForces[i] = Math.max(suspensionForce, 0);
  }

  
  const tireForces = [];
  for (let i = 0; i < 4; i++) {
    const slipRatio = THREE.MathUtils.clamp(
      (wheelForce - suspensionForces[i] * this.physics.tireGrip) / 
      (suspensionForces[i] * this.physics.tireGrip),
      -1,
      1
    );
    
    const slipAngle = Math.atan2(
      this.carState.velocity.x,
      Math.abs(this.carState.velocity.z)
    );
    
    const longitudinalForce = Math.sin(Math.atan(3 * slipRatio)) * 
      this.physics.tireGrip * suspensionForces[i];
    
    const lateralForce = -Math.sin(Math.atan(3 * slipAngle)) * 
      this.physics.tireGrip * suspensionForces[i];

    tireForces[i] = new THREE.Vector3(lateralForce, 0, longitudinalForce);
  }

  
  const totalForce = new THREE.Vector3();
  tireForces.forEach(force => totalForce.add(force));
  

  const speed = this.carState.velocity.length();
  totalForce.z -= 0.5 * this.physics.aeroDrag * speed * speed;
  totalForce.y -= 0.5 * this.physics.aeroLift * speed * speed;

  const carAcceleration = totalForce.divideScalar(this.physics.weight);
  this.carState.velocity.add(acceleration.multiplyScalar(deltaTime));


  this.carState.velocity.multiplyScalar(
    1 - (this.physics.rollingResistance * 0.1 + 
    this.physics.dragCoefficient * speed * 0.01) * deltaTime
  );


  const steerInput = (this.keys.A ? 1 : 0) - (this.keys.D ? 1 : 0);
  const speedFactor = 1 - THREE.MathUtils.clamp(speed / 30, 0, 0.8);
  this.carState.steering = THREE.MathUtils.clamp(
    this.carState.steering + steerInput * this.physics.steeringStep * speedFactor,
    -this.physics.steeringClamp,
    this.physics.steeringClamp
  );


  const angularAcceleration = new THREE.Vector3(
    (tireForces[2].z - tireForces[3].z) * this.physics.axleTrack * 0.5,
    0,
    (tireForces[0].x - tireForces[1].x) * this.physics.wheelBase * 0.5
  ).divideScalar(this.physics.weight * 0.3);
  
  this.carState.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
  this.carState.angularVelocity.multiplyScalar(0.92); 


  const deltaPos = this.carState.velocity.clone().multiplyScalar(deltaTime);
  this.carRoot.position.add(deltaPos);
  
  const angularDelta = this.carState.angularVelocity.clone().multiplyScalar(deltaTime);
  this.carRoot.rotation.x += angularDelta.x * 0.5;
  this.carRoot.rotation.y += angularDelta.y;
  this.carRoot.rotation.z += angularDelta.z * 0.5;

  this.model.traverse(child => {
    if (child.name.includes('wheel')) {
      
      const wheelSpeed = deltaPosition.length() / (this.physics.wheelRadius * 50);
      child.rotation.x += wheelSpeed * (child.name.includes('front') ? 1.2 : 1) * deltaTime;
      
     
      if (child.name.includes('front')) {
        child.rotation.y = THREE.MathUtils.lerp(
          child.rotation.y,
          this.carState.steering * (child.name.includes('left') ? 1 : -1),
          0.2
        );
      }
    }
  });

 
  const currentWheelRPM = (this.carState.velocity.z / (this.physics.wheelRadius * 50)) * 9.5493;
  this.physics.engineRPM = THREE.MathUtils.clamp(
    wheelRPM * this.physics.gearRatio[this.physics.currentGear - 1],
    1000,
    this.physics.maxRPM
  );

  if (this.physics.engineRPM > 6000 && this.physics.currentGear < 5) {
    this.physics.currentGear++;
    this.physics.engineRPM = 4000;
  } else if (this.physics.engineRPM < 2000 && this.physics.currentGear > 1) {
    this.physics.currentGear--;
    this.physics.engineRPM = 3000;
  }


    
    const calculatedTireForces = [];
    for (let i = 0; i < 4; i++) {
      const slip = this.carState.slipRatios[i];
      const angle = this.carState.slipAngles[i];
      
      const longitudinalForce = Math.sin(Math.atan(3 * slip)) * 
        this.physics.tireGrip * suspensionForces[i];
      
      const lateralForce = -Math.sin(Math.atan(3 * angle)) * 
        this.physics.tireGrip * suspensionForces[i];
      
      calculatedTireForces[i] = new THREE.Vector3(
        lateralForce,
        0,
        longitudinalForce
      );
    }

    
    const totalCarForce = new THREE.Vector3();
    tireForces.forEach(force => totalCarForce.add(force));
    totalCarForce.z -= aeroDragForce;
    totalCarForce.y -= aeroLiftForce;

   
    const acceleration = totalForce.divideScalar(this.physics.weight);
    this.carState.velocity.add(acceleration.multiplyScalar(deltaTime));

    // Apply rolling resistance and drag
    this.carState.velocity.multiplyScalar(
      1 - (this.physics.rollingResistance + this.physics.dragCoefficient) * deltaTime
    );

    // Steering calculation with Ackermann geometry
    const steerAngle = THREE.MathUtils.clamp(
      this.carState.steering, 
      -this.physics.maxSteer, 
      this.physics.maxSteer
    );
    
    const leftSteer = Math.atan(
      this.physics.wheelBase / 
      (this.physics.wheelBase / Math.tan(steerAngle) - this.physics.axleTrack / 2)
    );
    
    const rightSteer = Math.atan(
      this.physics.wheelBase / 
      (this.physics.wheelBase / Math.tan(steerAngle) + this.physics.axleTrack / 2)
    );

    // Update wheel angles
    this.carState.wheelAngles[0] = leftSteer;
    this.carState.wheelAngles[1] = rightSteer;

    // Update car position and rotation
    const deltaPosition = this.carState.velocity.clone().multiplyScalar(deltaTime);
    this.carRoot.position.add(deltaPosition);

    // Calculate rotational dynamics
    const angularAcceleration2 = new THREE.Vector3(
      (tireForces[2].z - tireForces[3].z) * this.physics.axleTrack / 2,
      0,
      (tireForces[0].x - tireForces[1].x) * this.physics.wheelBase / 2
    ).divideScalar(this.physics.weight * 0.3);
    
    this.carState.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
    this.carState.angularVelocity.multiplyScalar(0.95); // Angular damping

    const deltaRotation = this.carState.angularVelocity.clone().multiplyScalar(deltaTime);
    this.carRoot.rotation.x += deltaRotation.x;
    this.carRoot.rotation.y += deltaRotation.y;
    this.carRoot.rotation.z += deltaRotation.z;

    // Update visual wheel rotation
    this.model.traverse(child => {
      if (child.name.includes('wheel')) {
        const wheelSpeed = this.carState.velocity.z / this.physics.wheelRadius;
        child.rotation.x += wheelSpeed * deltaTime;
      }
    });

    // Update RPM based on wheel speed
    const calculatedWheelRPM = (this.carState.velocity.z / this.physics.wheelRadius) * 9.5493;
    this.physics.engineRPM = THREE.MathUtils.clamp(
      wheelRPM * this.physics.gearRatio[this.physics.currentGear - 1],
      1000,
      this.physics.maxRPM
    );

    // Gear shifting
    if (this.physics.engineRPM > 6000 && this.physics.currentGear < 5) {
      this.physics.currentGear++;
      this.physics.engineRPM = 3000;
    } else if (this.physics.engineRPM < 2000 && this.physics.currentGear > 1) {
      this.physics.currentGear--;
      this.physics.engineRPM = 4000;
    }
  }

  handleKeyDown(e) {
    // Enhanced input handling with analog-like response
    const rate = 0.1;
    if (e.key === 'w') {
      this.carState.engineTorque = Math.min(
        this.carState.engineTorque + rate, 
        1
      );
    }
    if (e.key === 's') {
      this.carState.brakeTorque = Math.min(
        this.carState.brakeTorque + rate, 
        1
      );
    }
    if (e.key === 'a') {
      this.carState.steering = THREE.MathUtils.clamp(
        this.carState.steering + this.physics.steeringStep, 
        -this.physics.steeringClamp, 
        this.physics.steeringClamp
      );
    }
    if (e.key === 'd') {
      this.carState.steering = THREE.MathUtils.clamp(
        this.carState.steering - this.physics.steeringStep, 
        -this.physics.steeringClamp, 
        this.physics.steeringClamp
      );
    }
  }

  handleKeyUp(e) {
    const rate = 0.2;
    if (e.key === 'w') {
      this.carState.engineTorque = Math.max(
        this.carState.engineTorque - rate, 
        0
      );
    }
    if (e.key === 's') {
      this.carState.brakeTorque = Math.max(
        this.carState.brakeTorque - rate, 
        0
      );
    }
    if (e.key === 'a' || e.key === 'd') {
      this.carState.steering *= 0.8;
      if (Math.abs(this.carState.steering) < 0.01) this.carState.steering = 0;
    }
  }
  updateCamera() {
    if (!this.carRoot || this.controls.enabled) return;

    const cameraOffset = new THREE.Vector3();
    const carDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), 
      this.carRoot.rotation.y
    );

    const distanceBehind = 15 + Math.abs(this.speed) * 0.5;
    const heightAbove = 7 + Math.abs(this.speed) * 0.2;

    cameraOffset.copy(carDirection).multiplyScalar(-distanceBehind);
    cameraOffset.y = heightAbove;

    const targetPosition = new THREE.Vector3().copy(this.carRoot.position).add(cameraOffset);
    
    const distance = this.camera.position.distanceTo(targetPosition);
    const smoothFactor = THREE.MathUtils.clamp(0.05 + (distance * 0.01), 0.05, 0.2);
    
    this.camera.position.lerp(targetPosition, smoothFactor);

    const lookAheadFactor = Math.abs(this.speed) * 0.5;
    const lookAtOffset = new THREE.Vector3().copy(carDirection).multiplyScalar(10 + lookAheadFactor);
    const lookAtPos = new THREE.Vector3().copy(this.carRoot.position).add(lookAtOffset);
    this.camera.lookAt(lookAtPos);
  }
  
  updatePortfolioText() {
    if (!this.portfolioTextMesh || !this.portfolioCardMesh || !this.carRoot) return;
    
    // Check distance between car and portfolio text
    const distanceToText = this.carRoot.position.distanceTo(this.portfolioTextMesh.position);
    
    // Transform text to card when car is nearby
    if (distanceToText < this.portfolioText.proximityThreshold && !this.portfolioText.isCard) {
      this.portfolioText.isCard = true;
      this.portfolioTextMesh.visible = false;
      this.portfolioCardMesh.visible = true;
      this.cardBackMesh.visible = true;
    } 
    // Transform card back to text when car moves away
    else if (distanceToText >= this.portfolioText.proximityThreshold && this.portfolioText.isCard) {
      this.portfolioText.isCard = false;
      this.portfolioTextMesh.visible = true;
      this.portfolioCardMesh.visible = false;
      this.cardBackMesh.visible = false;
    }
    
    // Make the card face the car when in card mode
    if (this.portfolioText.isCard) {
      const cardToCarDirection = new THREE.Vector3()
        .subVectors(this.carRoot.position, this.portfolioCardMesh.position)
        .normalize();
      
      // Calculate rotation to face the car (keeping the tilt)
      const targetAngle = Math.atan2(cardToCarDirection.x, cardToCarDirection.z);
      const currentY = this.portfolioCardMesh.rotation.y;
      
      // Smooth rotation
      this.portfolioCardMesh.rotation.y = THREE.MathUtils.lerp(
        currentY, 
        targetAngle, 
        0.05
      );
      
      // Keep card back facing opposite direction
      this.cardBackMesh.position.copy(this.portfolioCardMesh.position);
      this.cardBackMesh.rotation.copy(this.portfolioCardMesh.rotation);
      this.cardBackMesh.rotation.y += Math.PI;
      
      // Make card hover/float
      const hoverHeight = 0.2 * Math.sin(this.lastTime * 2);
      this.portfolioCardMesh.position.y = this.portfolioText.position.y + 1 + hoverHeight;
      this.cardBackMesh.position.y = this.portfolioCardMesh.position.y - 0.01;
    }
  }
  
  animate(time) {
    requestAnimationFrame((t) => this.animate(t));
    
    const currentTime = time * 0.001;
    const deltaTime = Math.min(currentTime - this.lastTime, 0.1);
    this.lastTime = currentTime;
    
    this.updateCarPhysics(deltaTime);
    this.updateCamera();
    this.updatePortfolioText();
    
    if (this.controls.enabled) {
      this.controls.update();
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new CarGame();
  
  const instructions = document.createElement('div');
  instructions.style.position = 'absolute';
  instructions.style.top = '10px';
  instructions.style.left = '10px';
  instructions.style.color = 'white';
  instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  instructions.style.padding = '15px';
  instructions.style.borderRadius = '8px';
  instructions.style.fontFamily = 'Arial, sans-serif';
  instructions.style.maxWidth = '250px';
  instructions.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  instructions.style.transition = 'opacity 0.3s';
  instructions.style.zIndex = '100';
  instructions.innerHTML = `
    <h2 style="margin-top: 0; color: #4fc3f7;">Portfolio Car Game</h2>
    <h3 style="margin-bottom: 5px;">Controls:</h3>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">W</kbd> - Accelerate</p>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">S</kbd> - Reverse</p>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">A</kbd>/<kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">D</kbd> - Steer</p>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">Space</kbd> - Brake</p>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">R</kbd> - Reset position</p>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">C</kbd> - Toggle camera mode</p>
    <p><kbd style="background: #444; padding: 2px 5px; border-radius: 3px;">H</kbd> - Toggle debug mode</p>
    <div style="text-align: center; margin-top: 10px;">
      <button id="hideInstructions" style="background: #4fc3f7; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
        Hide Instructions
      </button>
    </div>
  `;
  document.body.appendChild(instructions);
  
  const showButton = document.createElement('button');
  showButton.textContent = 'Show Instructions';
  showButton.style.position = 'absolute';
  showButton.style.top = '10px';
  showButton.style.left = '10px';
  showButton.style.background = '#4fc3f7';
  showButton.style.border = 'none';
  showButton.style.padding = '8px 12px';
  showButton.style.borderRadius = '4px';
  showButton.style.cursor = 'pointer';
  showButton.style.display = 'none';
  showButton.style.zIndex = '100';
  
  document.body.appendChild(showButton);
  
  document.getElementById('hideInstructions').addEventListener('click', () => {
    instructions.style.opacity = '0';
    setTimeout(() => {
      instructions.style.display = 'none';
      showButton.style.display = 'block';
    }, 300);
  });
  
  showButton.addEventListener('click', () => {
    instructions.style.display = 'block';
    setTimeout(() => {
      instructions.style.opacity = '1';
    }, 10);
    showButton.style.display = 'none';
  });
});