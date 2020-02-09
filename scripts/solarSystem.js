"use strict";

function solarSystem() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    var createFlattenedVertices = function(gl, vertices) {
        var last;
        return webglUtils.createBufferInfoFromArrays(
            gl,
            primitives.makeRandomVertexColors(
                primitives.deindexVertices(vertices),
                {
                    vertsPerColor: 1,
                    rand: function(ndx, channel) {
                        if (channel === 0) {
                            last = 128 + Math.random() * 128 | 0;
                        }
                        return channel < 3 ? last : 255;
                    }
                })
        );
    };

    var skyboxProgram = webglUtils.createProgramFromScripts(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);

    // setup GLSL program
    var programInfo = webglUtils.createProgramInfo(gl, ["simple-3d-vertex-shader", "simple-3d-fragment-shader"]);

    var sphereBufferInfo = createFlattenedVertices(gl, primitives.createSphereVertices(10, 12, 6));

    //skybox atributes and uniforms
    var skyboxPositionLocation = gl.getAttribLocation(skyboxProgram, "a_position");
    var skyboxLocation = gl.getUniformLocation(skyboxProgram, "u_skybox");
    var viewDirectionProjectionInverseLocation = gl.getUniformLocation(skyboxProgram, "u_viewDirectionProjectionInverse");

    // Create a buffer for positions
    var skyboxPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);
    setGeometry(gl);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: '../images/skybox/Front_Tex.png',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: '../images/skybox/Back_Tex.png',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: '../images/skybox/Left_Tex.png',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: '../images/skybox/Right_Tex.png',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: '../images/skybox/Down_Tex.png',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: '../images/skybox/Up_Tex.png',
        },
    ];

    faceInfos.forEach((faceInfo) => {
        const {target, url} = faceInfo;

        // Upload the canvas to the cubemap face.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 512;
        const height = 512;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // setup each face so it's immediately renderable
        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        // Asynchronously load an image
        const image = new Image();
        image.src = url;
        image.addEventListener('load', function() {
            // Now that the image has loaded make copy it to the texture.
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        });
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function emod(x, n) {
        return x >= 0 ? (x % n) : ((n - (-x % n)) % n);
    }


    var cameraAngleRadians = degToRad(0);
    var fieldOfViewRadians = degToRad(60);
    var cameraHeight = 50;

    var objectsToDraw = [];
    var objects = [];

    // Let's make all the nodes
    var solarSystemNode = new Node();
    var earthOrbitNode = new Node();
    earthOrbitNode.localMatrix = m4.translation(175, 0, 0);  // earth orbit 100 units from the sun
    var moonOrbitNode = new Node();
    moonOrbitNode.localMatrix = m4.translation(30, 0, 0);  // moon 30 units from the earth

    var sunNode = new Node();
    sunNode.localMatrix = m4.scaling(5, 5, 5);  // sun a the center
    sunNode.drawInfo = {
        uniforms: {
            u_colorOffset: [0.6, 0.6, 0, 1], // yellow
            u_colorMult:   [0.4, 0.4, 0, 1],
        },
        programInfo: programInfo,
        bufferInfo: sphereBufferInfo,
    };

    var earthNode = new Node();
    earthNode.localMatrix = m4.scaling(2, 2, 2);   // make the earth twice as large
    earthNode.drawInfo = {
        uniforms: {
            u_colorOffset: [0.2, 0.5, 0.8, 1],  // blue-green
            u_colorMult:   [0.8, 0.5, 0.2, 1],
        },
        programInfo: programInfo,
        bufferInfo: sphereBufferInfo,
    };

    var moonNode = new Node();
    moonNode.localMatrix = m4.scaling(0.4, 0.4, 0.4);
    moonNode.drawInfo = {
        uniforms: {
            u_colorOffset: [0.6, 0.6, 0.6, 1],  // gray
            u_colorMult:   [0.1, 0.1, 0.1, 1],
        },
        programInfo: programInfo,
        bufferInfo: sphereBufferInfo,
    };


    // connect the celetial objects
    sunNode.setParent(solarSystemNode);
    earthOrbitNode.setParent(solarSystemNode);
    earthNode.setParent(earthOrbitNode);
    moonOrbitNode.setParent(earthOrbitNode);
    moonNode.setParent(moonOrbitNode);

    var objects = [
        sunNode,
        earthNode,
        moonNode,
    ];

    var objectsToDraw = [
        sunNode.drawInfo,
        earthNode.drawInfo,
        moonNode.drawInfo,
    ];

    requestAnimationFrame(drawScene);

    // Draw the scene.
    function drawScene(time) {
        time *= 0.0005;

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Clear the canvas AND the depth buffer.
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Compute the projection matrix
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var projectionMatrix =
            m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        // Compute the camera's matrix using look at.
        var cameraPosition = [0, -300, 700];
        var target = [0, 0, 0];
        var up = [0, 0, 1];
        var cameraMatrix = m4.lookAt(cameraPosition, target, up);

        // Make a view matrix from the camera matrix.
        var viewMatrix = m4.inverse(cameraMatrix);

        var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        gl.useProgram(skyboxProgram);

        // Turn on the position attribute
        gl.enableVertexAttribArray(skyboxPositionLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);

        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            skyboxPositionLocation, size, type, normalize, stride, offset);

        viewMatrix[12] = 0;
        viewMatrix[13] = 0;
        viewMatrix[14] = 0;

        var viewDirectionProjectionMatrix =
            m4.multiply(projectionMatrix, viewMatrix);
        var viewDirectionProjectionInverseMatrix =
            m4.inverse(viewDirectionProjectionMatrix);

        // Set the uniforms
        gl.uniformMatrix4fv(
            viewDirectionProjectionInverseLocation, false,
            viewDirectionProjectionInverseMatrix);

        gl.uniform1i(skyboxLocation, 0);

        // let our quad pass the depth test at 1.0
        gl.depthFunc(gl.LEQUAL);

        // Draw the geometry.
        gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);


        // update the local matrices for each object.
        m4.multiply(m4.yRotation(0.01), earthOrbitNode.localMatrix, earthOrbitNode.localMatrix);
        m4.multiply(m4.yRotation(0.01), moonOrbitNode.localMatrix, moonOrbitNode.localMatrix);
        // spin the earth
        m4.multiply(m4.yRotation(0.05), earthNode.localMatrix, earthNode.localMatrix);
        // spin the moon
        m4.multiply(m4.yRotation(-0.01), moonNode.localMatrix, moonNode.localMatrix);

        // Update all world matrices in the scene graph
        solarSystemNode.updateWorldMatrix();

        // Compute all the matrices for rendering
        objects.forEach(function(object) {
            object.drawInfo.uniforms.u_matrix = m4.multiply(viewProjectionMatrix, object.worldMatrix);
        });

        // ------ Draw the objects --------

        var lastUsedProgramInfo = null;
        var lastUsedBufferInfo = null;

        objectsToDraw.forEach(function(object) {
            var programInfo = object.programInfo;
            var bufferInfo = object.bufferInfo;
            var bindBuffers = false;

            if (programInfo !== lastUsedProgramInfo) {
                lastUsedProgramInfo = programInfo;
                gl.useProgram(programInfo.program);

                // We have to rebind buffers when changing programs because we
                // only bind buffers the program uses. So if 2 programs use the same
                // bufferInfo but the 1st one uses only positions the when the
                // we switch to the 2nd one some of the attributes will not be on.
                bindBuffers = true;
            }

            // Setup all the needed attributes.
            if (bindBuffers || bufferInfo !== lastUsedBufferInfo) {
                lastUsedBufferInfo = bufferInfo;
                webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
            }

            // Set the uniforms.
            webglUtils.setUniforms(programInfo, object.uniforms);

            // Draw
            gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
        });

        requestAnimationFrame(drawScene);
    }
}

// Fill the buffer with the values that define a quad.
function setGeometry(gl) {
    var positions = new Float32Array(
        [
            -1, -1,
            1, -1,
            -1,  1,
            -1,  1,
            1, -1,
            1,  1,
        ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}