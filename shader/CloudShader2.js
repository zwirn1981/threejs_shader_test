THREE.ShaderLib['clouds'] = {
/*
	uniforms: {

		luminance:	 { type: "f", value:1 },
		turbidity:	 { type: "f", value:2 },
		reileigh:	 { type: "f", value:1 },
		mieCoefficient:	 { type: "f", value:0.005 },
		mieDirectionalG: { type: "f", value:0.8 },
		sunPosition: 	 { type: "v3", value: new THREE.Vector3() }

	},
*/
	vertexShader: [

		"varying vec3 vWorldPosition;",

		"void main() {",

			"vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
			"vWorldPosition = worldPosition.xyz;",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}",

	].join("\n"),

	fragmentShader: [

		"vec3 sunLight  = normalize( vec3(  0.35, 0.14,  0.3 ) );",
		"const vec3 sunColour = vec3(1.0, .7, .55);",
		
		"const float CLOUD_LOWER = 2000.0;",
		"const float CLOUD_UPPER = 3800.0;",
		
		"const vec2 MOD2 = vec2(.16632,.17369);",
		"const ve3 MOD3 = vec3(.16532,.17369,.15787);",

		"float gTime, cloudy;",
		"vec3 flash;",

		"float Hash( float p )",
		"{",
			"vec2 p2 = fract(vec2(p) * MOD2);",
			"p2 += dot(p2.yx, p2.xy+19.19);",
			"return fract(p2.x * p2.y);",
		"}",

		"float Hash(vec3 p)",
		"{",
			"p  = fract(p * MOD3);",
			"p += dot(p.xyz, p.yzx + 19.19);",
			"return fract(p.x * p.y * p.z);",
		"}",

		"float Noise(in vec3 p)",
		"{",
			"vec3 i = floor(p);",
			"vec3 f = fract(p);",
			"f *= f * (3.0-2.0*f);",

			"return mix(",
				"mix(mix(Hash(i + vec3(0.,0.,0.)), Hash(i + vec3(1.,0.,0.)),f.x),mix(Hash(i + vec3(0.,1.,0.)), Hash(i + vec3(1.,1.,0.)),f.x),f.y),mix(mix(Hash(i + vec3(0.,0.,1.)), Hash(i + vec3(1.,0.,1.)),f.x),mix(Hash(i + vec3(0.,1.,1.)), Hash(i + vec3(1.,1.,1.)),f.x),f.y),f.z);",
		"}",
		
		
		"float FBM( vec3 p )",
		"{",
			"p *= .25;",
			"float f;",
			
			"f = 0.5000 * Noise(p); p = p * 3.02;",
			"f += 0.2500 * Noise(p); p = p * 3.03;",
			"f += 0.1250 * Noise(p); p = p * 3.01;",
			"f += 0.0625   * Noise(p); p =  p * 3.03;",
			"f += 0.03125  * Noise(p); p =  p * 3.02;",
			"f += 0.015625 * Noise(p);",
		"}",

	
		"float Map(vec3 p)",
		"{",
			"p *= .002;",
		"}",

		"vec3 GetSky(in vec3 pos,in vec3 rd, out vec2 outPos)",
		"{",
			"float sunAmount = max( dot( rd, sunLight), 0.0 );",
			// Do the blue and sun...	
			"vec3  sky = mix(vec3(.0, .1, .4), vec3(.3, .6, .8), 1.0-rd.y);",
			"sky = sky + sunColour * min(pow(sunAmount, 1500.0) * 5.0, 1.0);",
			"sky = sky + sunColour * min(pow(sunAmount, 10.0) * .6, 1.0);",
			
			"sky =vec3(0.0,0.0,1.0);",
			
			// Find the start and end of the cloud layer...
			"float beg = ((CLOUD_LOWER-pos.y) / rd.y);",
			"float end = ((CLOUD_UPPER-pos.y) / rd.y);",
			
			// Start position...
			"vec3 p = vec3(pos.x + rd.x * beg, 0.0, pos.z + rd.z * beg);",
			//outPos = p.xz;
			"beg +=  Hash(p)*150.0;",

			// Trace clouds through that layer...
			"float d = 0.0;",
			"vec3 add = rd * ((end-beg) / 35.0);",
			"vec2 shade;",
			"vec2 shadeSum = vec2(0.0, .0);",
			"float difference = CLOUD_UPPER-CLOUD_LOWER;",
			"shade.x = .01;",
			// I think this is as small as the loop can be
			// for an reasonable cloud density illusion.
			"for (int i = 0; i < 55; i++)",
			"{",
				"if (shadeSum.y >= 1.0) break;",
				"float h = Map(p);",
				"shade.y = max(-h, 0.0);",         
				"shade.x = p.y / difference;",  // Grade according to height

				"shadeSum += shade * (1.0 - shadeSum.y);",

				"p += add;",
			"}",
			
			"shadeSum.x /= 10.0;",
			"shadeSum = min(shadeSum, 1.0);",
			
			"vec3 clouds = mix(vec3(pow(shadeSum.x, .2)), sunColour, (1.0-shadeSum.y)*.4);",
			
			"clouds += min((1.0-sqrt(shadeSum.y)) * pow(sunAmount, 4.0), 1.0) * 2.0;",
   
			"clouds += flash * (shadeSum.y + shadeSum.x + 0.2) * 0.5",
	
			"sky = mix(sky, min(clouds, 1.0), shadeSum.y)",
			
			"return clamp(sky, 0.0, 1.0)",
		"}",

		"void main() ",
		"{",

			"float m = (iMouse.x/iResolution.x)*30.0;",
			"gTime = iGlobalTime*.5 + m + 75.5;",
			//cloudy = cos(gTime * .25+.4) * .26;
			"cloudy = .16;",
			
			"float lightning = 0.0;",
			
			"if (cloudy >= .2)",
			"{",
				"float f = mod(gTime+1.5, 2.5);",
				"if (f < .8)",
				"{",
					"f = smoothstep(.8, .0, f)* 1.5;",
					"lightning = mod(-gTime*(1.5-Hash(gTime*.3)*.002), 1.0) * f;",
				"}",
			"}",
			
			"flash = clamp(vec3(1., 1.0, 1.2) * lightning, 0.0, 1.0);",
			//flash = clamp(vec3(1., 0.0, 0.0) * lightning, 0.0, 1.0);
			   
			
			"vec2 xy = fragCoord.xy / iResolution.xy;",
			"vec2 uv = (-1.0 + 2.0 * xy) * vec2(iResolution.x/iResolution.y,1.0);",
			
			"vec3 cameraPos = vec3(0.0,-100000.0,(gTime*1000.0)); //CameraPath(gTime - 2.0);",
			"vec3 camTar = vec3(0.0,100000.0,(gTime*1000.0)); //CameraPath(gTime - .0);",
			//camTar.y = cameraPos.y = sin(gTime) * 200.0 + 300.0;
			//camTar.y += 370.0;
			
			//float roll = .1 * sin(gTime * .25);
			"float roll = 0.2;",
			"vec3 cw = normalize(camTar-cameraPos);",
			"vec3 cp = vec3(sin(roll), cos(roll),0.0);",
			"vec3 cu = cross(cw,cp);",
			"vec3 cv = cross(cu,cw);",
			"vec3 dir = normalize(uv.x*cu + uv.y*cv + 1.3*cw);",
			
			"vec2 pos;",
			"vec3 col = GetSky(cameraPos, dir, pos);",
			
			"float l = exp(-length(pos) * .00002);",
			"col = mix(vec3(.6-cloudy*1.2)+flash*.3, col, max(l, .2));",
			
			"vec2 st =  uv * vec2(.5+(xy.y+1.0)*.3, .02)+vec2(gTime*.5+xy.y*.2, gTime*.2);",

			"col = pow(col, vec3(.7));",
		
			"gl_FragColor.a = vec4(col, 1.0);",
		"}",

	].join("\n")

};

THREE.Clouds = function () {

	var skyShader = THREE.ShaderLib[ "clouds" ];
	//var skyUniforms = THREE.UniformsUtils.clone( skyShader.uniforms );

	var cloudsMat = new THREE.ShaderMaterial( {
		fragmentShader: skyShader.fragmentShader,
		vertexShader: skyShader.vertexShader,
		//uniforms: skyUniforms,
		side: THREE.BackSide
	} );

	var cloudsGeo = new THREE.PlaneGeometry( 50000, 50000 );
	var cloudsMesh = new THREE.Mesh( cloudsGeo, cloudsMat );
	cloudsMesh.position.y = 2000;


	// Expose variables
	this.mesh = cloudsMesh;
	//this.uniforms = skyUniforms;

};
