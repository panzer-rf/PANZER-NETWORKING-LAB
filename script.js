document.addEventListener('DOMContentLoaded', function() {
    console.log('Packet Tracer Clone - Sistema iniciado');

    // Elementos DOM
    const workspace = document.getElementById('workspace');
    const deviceList = document.getElementById('device-list');
    const deviceCount = document.getElementById('device-count');
    const connectionCount = document.getElementById('connection-count');
    const consoleOutput = document.getElementById('console-output');
    const commandInput = document.getElementById('command-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');
    const infoBtn = document.getElementById('info-btn');

    // Variables de estado
    let selectedTool = null;
    let devices = [];
    let connections = [];
    let deviceIdCounter = 1;
    let isDragging = false;
    let dragDevice = null;
    let dragStartX, dragStartY, deviceStartX, deviceStartY;

    // Variables para conexiones con cables
    let cableMode = false;
    let firstDeviceForCable = null;
    let tempCable = null;

    // Variable para modo notas
    let noteMode = false;

    // INICIALIZACIÓN
    console.log('Workspace encontrado:', workspace);
    log('Sistema Packet Tracer Clone inicializado');
    log('Selecciona un dispositivo y haz clic en el área para colocarlo');
    updateDeviceList();

    // 1. SELECCIÓN DE HERRAMIENTAS
    document.querySelectorAll('.tool-btn[data-device]').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedTool = this.dataset.device;
            cableMode = (selectedTool === 'cable');
            noteMode = false; // Desactivar modo notas cuando se selecciona otra herramienta

            if (cableMode) {
                log('🔌 Modo CABLE activado. Haz clic en dos dispositivos para conectarlos');
                firstDeviceForCable = null;
            } else {
                log(`🛠️ Herramienta seleccionada: ${selectedTool}`);
            }

            updateSelectedTool();
            updateWorkspaceCursor();
        });
    });

    function updateSelectedTool() {
        document.querySelectorAll('.tool-btn[data-device]').forEach(btn => {
            if (btn.dataset.device === selectedTool) {
                btn.style.background = 'linear-gradient(145deg, #3b82f6, #1d4ed8)';
                btn.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
            } else {
                btn.style.background = 'linear-gradient(145deg, #1e3a8a, #1e40af)';
                btn.style.boxShadow = '0 3px 5px rgba(0, 0, 0, 0.2)';
            }
        });
    }
    function updateWorkspaceCursor() {
        if (cableMode) {
            workspace.style.cursor = 'crosshair';
        } else if (noteMode) {
            workspace.style.cursor = 'text';
        } else if (selectedTool) {
            workspace.style.cursor = 'cell';
        } else {
            workspace.style.cursor = 'default';
        }
    }

 // 2. CREACIÓN DE DISPOSITIVOS (CLIC EN EL WORKSPACE) - MODIFICADO PARA NOTAS
    workspace.addEventListener('mousedown', function(e) {
        // Si estamos en modo notas, manejar creación de notas
        if (noteMode && e.button === 0) {
            e.preventDefault();
            e.stopPropagation();

            // Solo crear nota si hacemos clic directamente en el workspace (no en un dispositivo o cable)
if (!e.target.closest('.device') && !e.target.closest('.connection') &&
    !e.target.classList.contains('floating-note')) {
                createNote(e.offsetX, e.offsetY);
            }
            return;
        }

        // Si NO estamos en modo notas, crear dispositivo
        if (e.button === 0 && !isDragging && selectedTool && !cableMode) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Creando dispositivo en:', e.offsetX, e.offsetY);

            // Calcular posición centrada
            const x = e.offsetX - 35;
            const y = e.offsetY - 35;

            // Verificar límites del workspace
            const workspaceRect = workspace.getBoundingClientRect();
            const maxX = workspaceRect.width - 70;
            const maxY = workspaceRect.height - 70;

            const finalX = Math.max(10, Math.min(x, maxX));
            const finalY = Math.max(10, Math.min(y, maxY));

            // Crear dispositivo
            const device = createDevice(selectedTool, finalX, finalY);
            workspace.appendChild(device.element);
            devices.push(device);

            // Actualizar interfaz
            updateDeviceList();
            log(`✅ ${getDeviceName(device.type)} ${device.id} creado en (${finalX}, ${finalY})`);

            // Resaltar el dispositivo recién creado
            highlightDevice(device.element);
        }
    });

    // 3. SISTEMA DE CONEXIONES CON CABLES
    workspace.addEventListener('click', function(e) {
        // Si estamos en modo cable y hacemos clic en un dispositivo
        if (cableMode && e.target.closest('.device')) {
            const deviceElement = e.target.closest('.device');
            const deviceId = parseInt(deviceElement.dataset.id);
            const device = devices.find(d => d.id === deviceId);

            if (!device) return;

            e.preventDefault();
            e.stopPropagation();

            if (!firstDeviceForCable) {
                // Primer dispositivo seleccionado
                firstDeviceForCable = device;
                device.element.classList.add('cable-selected');
                log(`🔌 Primer dispositivo seleccionado: ${device.label}`);
                log('Ahora selecciona el segundo dispositivo para conectar');
            } else if (firstDeviceForCable.id !== device.id) {
                // Segundo dispositivo seleccionado - crear cable
                createCable(firstDeviceForCable, device);
                firstDeviceForCable.element.classList.remove('cable-selected');
                firstDeviceForCable = null;
            } else {
                // Clic en el mismo dispositivo
                log('⚠️ Selecciona un dispositivo diferente para conectar');
            }
        }
    });

    // 4. FUNCIÓN PARA CREAR CABLES
    function createCable(device1, device2) {
        // Verificar si ya existe una conexión entre estos dispositivos
        const existingConnection = connections.find(conn =>
            (conn.device1.id === device1.id && conn.device2.id === device2.id) ||
            (conn.device1.id === device2.id && conn.device2.id === device1.id)
        );

        if (existingConnection) {
            log(`⚠️ Ya existe una conexión entre ${device1.label} y ${device2.label}`);
            return;
        }

        // Crear elemento de cable
        const cable = document.createElement('div');
        cable.className = 'connection';
        cable.dataset.device1 = device1.id;
        cable.dataset.device2 = device2.id;

        // Calcular posición y ángulo
        updateCablePosition(cable, device1, device2);

        // Agregar al workspace
        workspace.appendChild(cable);

        // Guardar conexión
        const connection = {
            id: connections.length + 1,
            device1: device1,
            device2: device2,
            element: cable,
            status: 'up'
        };

        connections.push(connection);

        // Actualizar interfaz
        updateDeviceList();
        log(`🔗 Cable conectado: ${device1.label} ↔ ${device2.label}`);

        // Resaltar los dispositivos conectados
        highlightConnection(device1.element, device2.element);
    }

    function updateCablePosition(cable, device1, device2) {
        // Calcular centro de los dispositivos
        const x1 = device1.x + 35;
        const y1 = device1.y + 35;
        const x2 = device2.x + 35;
        const y2 = device2.y + 35;

        // Calcular distancia y ángulo
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Establecer posición y rotación
        cable.style.width = `${distance}px`;
        cable.style.left = `${x1}px`;
        cable.style.top = `${y1}px`;
        cable.style.transform = `rotate(${angle}deg)`;
    }

    function highlightConnection(device1Element, device2Element) {
        device1Element.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.7)';
        device2Element.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.7)';

        setTimeout(() => {
            device1Element.style.boxShadow = '';
            device2Element.style.boxShadow = '';
        }, 1500);
    }

    // 5. FUNCIÓN PARA CREAR DISPOSITIVOS
    function createDevice(type, x, y) {
        const id = deviceIdCounter++;
        const element = document.createElement('div');
        element.className = `device ${type}`;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.dataset.id = id;

        // Configurar según tipo
        let icon, label, deviceName;
        switch(type) {
            case 'router':
                icon = 'fas fa-hdd';
                label = `R${id}`;
                deviceName = 'Router';
                break;
            case 'switch':
                icon = 'fas fa-sitemap';
                label = `SW${id}`;
                deviceName = 'Switch';
                break;
            case 'pc':
                icon = 'fas fa-desktop';
                label = `PC${id}`;
                deviceName = 'PC';
                break;
            case 'phone':
                icon = 'fas fa-phone';
                label = `PH${id}`;
                deviceName = 'Phone';
                break;

            case 'server':
                icon = 'fas fa-server';
                label = `SRV${id}`;
                deviceName = 'Server';
                break;
             case 'firewall':
                 icon = 'fas fa-shield-virus';
                 label = `FWL${id}`;
                 deviceName = 'Firewall';
                  break;
             case 'wireles-router':
                 icon = 'fas fa-wifi';
                 label = `RTR${id}`;
                  deviceName = 'router';
                 break;
             case 'laptop':
                 icon = 'fas fa-laptop';
                 label = `LPT${id}`;
                 deviceName = 'Laptop';
                 break;
             case 'internet-cloud':
                 icon = 'fas fa-cloud';
                  label = `CLD${id}`;
                 deviceName = 'Internet';
                 break;
        }

        element.innerHTML = `
            <i class="${icon}"></i>
            <div class="device-label">${label}</div>
        `;

        // EVENTOS DE ARRASTRE
        element.addEventListener('mousedown', function(e) {
            // Solo iniciar arrastre con clic izquierdo
            if (e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                startDrag(e, element, id);
            }
        });

        // Evento de clic derecho para eliminar
        element.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Mostrar menú contextual personalizado
            showDeviceContextMenu(e, id, element);
            return false;
        });

        // Evento de doble clic para renombrar
        element.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            renameDevice(id);
        });

        return {
            id,
            type,
            element,
            x,
            y,
            label,
            name: deviceName
        };
    }

    function getDeviceName(type) {
        switch(type) {
            case 'router': return 'Router';
            case 'switch': return 'Switch';
            case 'pc': return 'PC';
            case 'phone': return 'Phone';
            case 'server': return 'Server';
             case 'firewall': return 'Firewall';
             case 'wireles-router': return 'Wireles';
             case 'laptop': return 'Laptop';
             case 'internet-cloud': return 'Internet';
            default: return 'Dispositivo';
        }
    }

    // 6. SISTEMA DE ARRASTRE MEJORADO
    function startDrag(e, element, deviceId) {
        console.log('Iniciando arrastre del dispositivo:', deviceId);

        if (cableMode || noteMode) return;

        isDragging = true;
        dragDevice = devices.find(d => d.id === deviceId);

        if (!dragDevice) {
            console.error('Dispositivo no encontrado');
            return;
        }

        // Guardar posiciones iniciales
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        deviceStartX = dragDevice.x;
        deviceStartY = dragDevice.y;

        // Agregar clase de arrastre
        element.classList.add('dragging');

        // Actualizar cursor
        document.body.style.cursor = 'grabbing';
        element.style.cursor = 'grabbing';

        // Agregar eventos globales
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }

    function drag(e) {
        if (!isDragging || !dragDevice) return;

        // Calcular nueva posición
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        // Obtener límites del workspace
        const workspaceRect = workspace.getBoundingClientRect();
        const maxX = workspaceRect.width - 70;
        const maxY = workspaceRect.height - 70;

        // Calcular nueva posición con límites
        let newX = deviceStartX + dx;
        let newY = deviceStartY + dy;

        // Aplicar límites
        newX = Math.max(10, Math.min(newX, maxX));
        newY = Math.max(10, Math.min(newY, maxY));

        // Actualizar posición
        dragDevice.x = newX;
        dragDevice.y = newY;

        // Aplicar al DOM
        dragDevice.element.style.left = `${newX}px`;
        dragDevice.element.style.top = `${newY}px`;

        // Actualizar cables conectados
        updateConnectedCables(dragDevice);

        // Actualizar en tiempo real
        updateDeviceList();
    }

    function stopDrag() {
        if (!isDragging || !dragDevice) return;

        console.log('Fin del arrastre del dispositivo:', dragDevice.id);

        // Remover clase de arrastre
        dragDevice.element.classList.remove('dragging');

        // Restaurar cursor
        document.body.style.cursor = '';
        dragDevice.element.style.cursor = 'move';

        // Remover eventos
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);

        // Actualizar lista
        updateDeviceList();
        log(`📦 ${dragDevice.name} ${dragDevice.id} movido a (${dragDevice.x}, ${dragDevice.y})`);

        // Resetear variables
        isDragging = false;
        dragDevice = null;
    }

    // 7. ACTUALIZAR CABLES CONECTADOS
    function updateConnectedCables(device) {
        connections.forEach(connection => {
            if (connection.device1.id === device.id || connection.device2.id === device.id) {
                updateCablePosition(connection.element, connection.device1, connection.device2);
            }
        });
    }

    // 8. MENÚ CONTEXTUAL PARA DISPOSITIVOS (Clic derecho)
    function showDeviceContextMenu(e, deviceId, element) {
        const device = devices.find(d => d.id === deviceId);
        if (!device) return;

        // Remover menús anteriores
        removeContextMenus();

        // Crear menú contextual
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.background = 'rgba(30, 30, 46, 0.95)';
        contextMenu.style.border = '1px solid rgba(59, 130, 246, 0.5)';
        contextMenu.style.borderRadius = '8px';
        contextMenu.style.padding = '10px';
        contextMenu.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.5)';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.minWidth = '150px';

        // Opciones del menú
        contextMenu.innerHTML = `
            <div class="context-menu-header">
                <strong>${device.name} ${device.id}</strong>
            </div>
            <div class="context-menu-item" data-action="console">
                <i class="fas fa-terminal"></i> console
            </div>
            <div class="context-menu-item" data-action="port">
                <i class="fas fa-ethernet"></i> FastEthernet0/1
            </div>
            <div class="context-menu-item" data-action="port">
                <i class="fas fa-ethernet"></i> FastEthernet0/2
            </div>
            <div class="context-menu-item" data-action="interface">
                <i class="fas fa-ethernet"></i> GigabitEthernet0/1
            </div>
            <div class="context-menu-item" data-action="rename">
                <i class="fas fa-edit"></i> Renombrar
            </div>
            <div class="context-menu-item" data-action="info">
                <i class="fas fa-info-circle"></i> Información
            </div>
            <div class="context-menu-item" data-action="connect">
                <i class="fas fa-plug"></i> Conectar
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="delete" style="color: #ef4444;">
                <i class="fas fa-trash"></i> Eliminar
            </div>
        `;

        document.body.appendChild(contextMenu);

        // Agregar eventos a las opciones
        contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', function() {
                const action = this.dataset.action;

                switch(action) {
                    case 'rename':
                        renameDevice(deviceId);
                        break;
                    case 'info':
                        showDeviceInfo(device);
                        break;
                    case 'connect':
                        startConnectionFromMenu(device);
                        break;
                    case 'delete':
                        deleteDevice(deviceId);
                        break;
                }

                removeContextMenus();
            });
        });

        // Cerrar menú al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', closeContextMenu);
            document.addEventListener('contextmenu', closeContextMenu);
        }, 100);

        function closeContextMenu() {
            removeContextMenus();
            document.removeEventListener('click', closeContextMenu);
            document.removeEventListener('contextmenu', closeContextMenu);
        }
    }

    function removeContextMenus() {
        document.querySelectorAll('.context-menu').forEach(menu => {
            menu.remove();
        });
    }

    function showDeviceInfo(device) {
        const connectionsToDevice = connections.filter(conn =>
            conn.device1.id === device.id || conn.device2.id === device.id
        );

        log(`📋 INFORMACIÓN DE ${device.name} ${device.id}:`);
        log(`   Tipo: ${device.name}`);
        log(`   Posición: (${device.x}, ${device.y})`);
        log(`   Conexiones: ${connectionsToDevice.length}`);

        if (connectionsToDevice.length > 0) {
            connectionsToDevice.forEach(conn => {
                const otherDevice = conn.device1.id === device.id ? conn.device2 : conn.device1;
                log(`     - Conectado a: ${otherDevice.label}`);
            });
        }
    }

    function startConnectionFromMenu(device) {
        selectedTool = 'cable';
        cableMode = true;
        noteMode = false; // Desactivar modo notas
        firstDeviceForCable = device;
        device.element.classList.add('cable-selected');

        updateSelectedTool();
        updateWorkspaceCursor();

        log(`🔌 Modo cable activado desde menú`);
        log(`Primer dispositivo: ${device.label}`);
        log('Selecciona el segundo dispositivo para conectar');
    }

    // 9. FUNCIONES PARA MANEJAR DISPOSITIVOS
    function highlightDevice(element) {
        element.style.transform = 'scale(1.1)';
        element.style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.7)';

        setTimeout(() => {
            element.style.transform = '';
            element.style.boxShadow = '';
        }, 1000);
    }

    function deleteDevice(id) {
        const deviceIndex = devices.findIndex(d => d.id === id);
        if (deviceIndex === -1) return;

        const device = devices[deviceIndex];

        // Confirmar eliminación
        if (!confirm(`¿Eliminar ${device.label} y todas sus conexiones?`)) {
            return;
        }

        // Eliminar cables conectados
        const connectionsToRemove = connections.filter(conn =>
            conn.device1.id === id || conn.device2.id === id
        );

        connectionsToRemove.forEach(conn => {
            conn.element.remove();
            connections = connections.filter(c => c.id !== conn.id);
        });

        // Eliminar dispositivo
        device.element.remove();
        devices.splice(deviceIndex, 1);

        // Actualizar
        updateDeviceList();
        log(`🗑️ ${device.name} ${device.id} eliminado con ${connectionsToRemove.length} conexiones`);
    }

    function renameDevice(id) {
        const device = devices.find(d => d.id === id);
        if (!device) return;

        const newName = prompt(`Renombrar ${device.label}:`, device.label);
        if (newName && newName.trim() !== '') {
            const oldName = device.label;
            device.label = newName.trim();
            device.element.querySelector('.device-label').textContent = newName.trim();
            updateDeviceList();
            log(`✏️ ${oldName} renombrado a ${device.label}`);
        }
    }

    function updateDeviceList() {
        deviceList.innerHTML = '';

        if (devices.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No hay dispositivos';
            li.style.opacity = '0.7';
            deviceList.appendChild(li);
        } else {
            devices.forEach(device => {
                const li = document.createElement('li');

                // Contar conexiones
                const connectionCount = connections.filter(conn =>
                    conn.device1.id === device.id || conn.device2.id === device.id
                ).length;

                li.innerHTML = `
                    <i class="fas fa-${device.type === 'router' ? 'hdd' : device.type === 'switch' ? 'sitemap' : 'desktop'}"></i>
                    ${device.label}
                    <span style="float: right; font-size: 0.8em;">
                        <span style="color: ${connectionCount > 0 ? '#10b981' : '#9ca3af'}">
                            ${connectionCount} conexión(es)
                        </span>
                    </span>
                `;
                deviceList.appendChild(li);
            });
        }

        deviceCount.textContent = devices.length;
        connectionCount.textContent = connections.length;
    }

    // 10. CONSOLA DE COMANDOS
    function log(message) {
        const p = document.createElement('p');
        p.textContent = `> ${message}`;
        consoleOutput.appendChild(p);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        console.log(message);
    }

    sendBtn.addEventListener('click', executeCommand);
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') executeCommand();
    });

    function executeCommand() {
        const command = commandInput.value.trim();
        if (!command) return;

        log(`Comando: ${command}`);

        if (command === 'show devices' || command === 'sd') {
            showDevicesCommand();
        } else if (command === 'show connections' || command === 'sc') {
            showConnectionsCommand();
        } else if (command === 'clear all' || command === 'ca') {
            clearWorkspace();
        } else if (command === 'help' || command === 'h') {
            showHelpCommand();
        } else if (command.startsWith('add ')) {
            addDeviceCommand(command);
        } else if (command.startsWith('connect ') || command.startsWith('con ')) {
            connectDevicesCommand(command);
        } else if (command === 'notes mode' || command === 'nm') {
            toggleNoteMode();
        } else {
            log('❌ Comando no reconocido. Escribe "help" para ayuda.');
        }

        commandInput.value = '';
    }

    function showDevicesCommand() {
        if (devices.length === 0) {
            log('No hay dispositivos en la red');
        } else {
            log(`Total dispositivos: ${devices.length}`);
            devices.forEach(dev => {
                const connCount = connections.filter(conn =>
                    conn.device1.id === dev.id || conn.device2.id === dev.id
                ).length;
                log(`${dev.label} (${dev.name}) - Pos: (${dev.x}, ${dev.y}) - Conexiones: ${connCount}`);
            });
        }
    }

    function showConnectionsCommand() {
        if (connections.length === 0) {
            log('No hay conexiones en la red');
        } else {
            log(`Total conexiones: ${connections.length}`);
            connections.forEach(conn => {
                log(`${conn.device1.label} ↔ ${conn.device2.label}`);
            });
        }
    }

    function showHelpCommand() {
        log('=== COMANDOS DISPONIBLES ===');
        log('show devices (sd)     - Listar dispositivos');
        log('show connections (sc) - Listar conexiones');
        log('add [tipo]            - Añadir dispositivo (router/switch/pc)');
        log('connect [id1] [id2]   - Conectar dos dispositivos');
        log('clear all (ca)        - Limpiar workspace');
        log('notes mode (nm)       - Activar/desactivar modo notas');
        log('help (h)              - Esta ayuda');
    }

    function addDeviceCommand(command) {
        const parts = command.split(' ');
        if (parts.length < 2) {
            log('Uso: add [router|switch|pc]');
            return;
        }

        const type = parts[1].toLowerCase();
        if (!['router', 'switch', 'pc'].includes(type)) {
            log('Tipo inválido. Usa: router, switch o pc');
            return;
        }

        addDeviceAtCenter(type);
    }

    function connectDevicesCommand(command) {
        const parts = command.split(' ');
        if (parts.length < 3) {
            log('Uso: connect [id1] [id2] o con [id1] [id2]');
            return;
        }

        const id1 = parseInt(parts[1].replace('R', '').replace('SW', '').replace('PC', ''));
        const id2 = parseInt(parts[2].replace('R', '').replace('SW', '').replace('PC', ''));

        const device1 = devices.find(d => d.id === id1);
        const device2 = devices.find(d => d.id === id2);

        if (!device1 || !device2) {
            log('❌ Uno o ambos dispositivos no existen');
            return;
        }

        if (device1.id === device2.id) {
            log('❌ No puedes conectar un dispositivo consigo mismo');
            return;
        }

        createCable(device1, device2);
    }

    function addDeviceAtCenter(type) {
        const workspaceRect = workspace.getBoundingClientRect();
        const centerX = workspaceRect.width / 2 - 35;
        const centerY = workspaceRect.height / 2 - 35;

        const device = createDevice(type, centerX, centerY);
        workspace.appendChild(device.element);
        devices.push(device);

        updateDeviceList();
        log(`✅ ${getDeviceName(type)} creado en el centro del workspace`);
        highlightDevice(device.element);
    }

    // 11. BOTÓN LIMPIAR
    clearBtn.addEventListener('click', clearWorkspace);

    function clearWorkspace() {
        if (devices.length === 0) {
            log('⚠️ El workspace ya está vacío');
            return;
        }

        if (confirm(`¿Eliminar ${devices.length} dispositivo(s) y ${connections.length} conexión(es)?`)) {
            // Eliminar cables
            connections.forEach(conn => {
                if (conn.element.parentNode) {
                    conn.element.parentNode.removeChild(conn.element);
                }
            });

            // Eliminar dispositivos
            devices.forEach(device => {
                if (device.element.parentNode) {
                    device.element.parentNode.removeChild(device.element);
                }
            });

            // Eliminar notas
            document.querySelectorAll('.floating-note').forEach(note => {
                note.remove();
            });

            // Resetear
            devices = [];
            connections = [];
            firstDeviceForCable = null;
            noteMode = false;

            updateDeviceList();
            updateWorkspaceCursor();
            log('✅ Workspace limpiado completamente');
        }
    }

    // 12. BOTÓN INFORMACIÓN
    infoBtn.addEventListener('click', function() {
        log('=== PACKET TRACER CLONE ===');
        log('Versión: 3.0 - Con sistema de cables y notas');
        log('Desarrollado en Kali Linux + Apache');
        log('Clic izquierdo: Crear dispositivo');
        log('Arrastrar: Mover dispositivo');
        log('Modo cable: Conectar dispositivos');
        log('Modo notas: Crear notas flotantes');
        log('Doble clic: Renombrar dispositivo');
        log('Clic derecho: Menú contextual');
        log('Comando "notes mode": Activar modo notas');
    });

    // 13. ACTUALIZAR TAMAÑO DEL WORKSPACE
    function updateWorkspaceSize() {
        const sizeElement = document.getElementById('workspace-size');
        if (sizeElement) {
            const width = workspace.clientWidth;
            const height = workspace.clientHeight;
            sizeElement.textContent = `${width}x${height}px`;
        }
    }

    window.addEventListener('load', updateWorkspaceSize);
    window.addEventListener('resize', updateWorkspaceSize);
    setTimeout(updateWorkspaceSize, 100);

    // 14. SISTEMA DE NOTAS FLOTANTES
    function createNote(x, y) {
        // Crear elemento de nota
        const note = document.createElement('div');
        note.className = 'floating-note';
        note.contentEditable = true;

        // Calcular límites del workspace
        const workspaceRect = workspace.getBoundingClientRect();
        const maxX = workspaceRect.width - 150;
        const maxY = workspaceRect.height - 100;

        // Aplicar límites
        const finalX = Math.max(10, Math.min(x, maxX));
        const finalY = Math.max(10, Math.min(y, maxY));

        // Establecer posición y estilo
        note.style.left = `${finalX}px`;
        note.style.top = `${finalY}px`;
        note.style.position = 'absolute';
        note.style.background = 'rgba(255, 255, 180, 0.95)';
        note.style.border = '1px solid #fbbf24';
        note.style.borderRadius = '5px';
        note.style.padding = '10px';
        note.style.minWidth = '100px';
        note.style.minHeight = '30px';
        note.style.maxWidth = '200px';
        note.style.cursor = 'move';
        note.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
        note.style.zIndex = '50';
        note.style.fontSize = '14px';
        note.style.color = '#000';
        note.style.overflow = 'hidden';
        note.style.wordWrap = 'break-word';

        // Texto inicial
        note.textContent = 'Escribe aquí...';

        // Agregar al workspace
        workspace.appendChild(note);

        // Configurar eventos de la nota
        setupNoteEvents(note);

        // Enfocar y seleccionar texto
        setTimeout(() => {
            note.focus();
            // Seleccionar todo el texto inicial
            const range = document.createRange();
            range.selectNodeContents(note);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }, 50);

        log(`📝 Nota creada en (${finalX}, ${finalY})`);
    }

    function setupNoteEvents(note) {
        let isDraggingNote = false;
        let dragStartX, dragStartY, noteStartX, noteStartY;

        // Eliminar con doble clic
        note.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            this.remove();
            log('🗑️ Nota eliminada');
        });

        // Arrastrar para mover
        note.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                e.stopPropagation();
                e.preventDefault();

                // Si estamos en modo notas, permitir arrastre
                if (noteMode) {
                    isDraggingNote = true;
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                    noteStartX = parseInt(this.style.left) || 0;
                    noteStartY = parseInt(this.style.top) || 0;

                    this.classList.add('dragging');
                    this.style.opacity = '0.8';

                    function onMouseMove(e) {
                        if (!isDraggingNote) return;

                        const dx = e.clientX - dragStartX;
                        const dy = e.clientY - dragStartY;

                        // Obtener límites
                        const workspaceRect = workspace.getBoundingClientRect();
                        const maxX = workspaceRect.width - this.offsetWidth;
                        const maxY = workspaceRect.height - this.offsetHeight;

                        let newX = noteStartX + dx;
                        let newY = noteStartY + dy;

                        newX = Math.max(5, Math.min(newX, maxX));
                        newY = Math.max(5, Math.min(newY, maxY));

                        this.style.left = `${newX}px`;
                        this.style.top = `${newY}px`;
                    }

                    function onMouseUp() {
                        isDraggingNote = false;
                        note.classList.remove('dragging');
                        note.style.opacity = '1';
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    }

                    document.addEventListener('mousemove', onMouseMove.bind(this));
                    document.addEventListener('mouseup', onMouseUp);
                }
            }
        });

        // Cambiar cursor
        note.addEventListener('mouseenter', function() {
            if (noteMode) {
                this.style.cursor = 'move';
            } else {
                this.style.cursor = 'text';
            }
        });

        note.addEventListener('mouseleave', function() {
            if (!isDraggingNote) {
                this.style.cursor = 'text';
            }
        });

        // Prevenir que el clic en la note active otros modos
        note.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        // Permitir edición
        note.addEventListener('input', function() {
            // Autoajustar altura
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    function toggleNoteMode() {
        noteMode = !noteMode;

        if (noteMode) {
            // Desactivar otras herramientas
            selectedTool = null;
            cableMode = false;
            firstDeviceForCable = null;

            // Actualizar UI
            updateSelectedTool();
            updateWorkspaceCursor();

            log('📝 Modo notas ACTIVADO - Haz clic en el área para escribir');
            log('💡 Doble clic en una nota para eliminarla');
            log('💡 Arrastra una nota para moverla');
        } else {
            updateWorkspaceCursor();
            log('📝 Modo notas DESACTIVADO');
        }
    }

    // 15. BOTÓN DE NOTAS (si existe)
    const notesBtn = document.getElementById('notes-btn');
    if (notesBtn) {
        notesBtn.addEventListener('click', function() {
            toggleNoteMode();

            // Resaltar botón si está activo
            if (noteMode) {
                this.style.background = 'linear-gradient(145deg, #f59e0b, #d97706)';
                this.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.5)';
            } else {
                this.style.background = 'linear-gradient(145deg, #1e3a8a, #1e40af)';
                this.style.boxShadow = '0 3px 5px rgba(0, 0, 0, 0.2)';
            }
        });
    } else {
        // Si no hay botón, mostrar comando en consola
        log('💡 Usa el comando "notes mode" o "nm" para activar las notas flotantes');
    }

    // 16. INICIALIZAR CON TIPS
    setTimeout(() => {
        if (devices.length === 0) {
            log('💡 Tip: Crea dispositivos con la barra de herramientas');
            log('💡 Tip: Usa el botón "Cable" para conectar dispositivos');
            log('💡 Tip: Escribe "notes mode" en la consola para activar notas flotantes');
            log('💡 Tip: Clic derecho en dispositivo para más opciones');
        }
    }, 2000);
});

