#!/usr/bin/env node

/**
 * Elevator Simulation - Back-End Challenge
 * JavaScript implementation with async/await and modern ES6+ features
 */

// Enums for type safety
const Direction = {
    UP: 1,
    DOWN: -1,
    IDLE: 0,
    getName: function(value) {
        return Object.keys(this).find(key => this[key] === value) || 'UNKNOWN';
    }
};

const DoorState = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    OPENING: 'OPENING',
    CLOSING: 'CLOSING'
};

class FloorRequest {
    constructor(floor, direction) {
        this.floor = floor;
        this.direction = direction;
        this.timestamp = Date.now();
    }
}

class Elevator {
    constructor(elevatorId, minFloor = 1, maxFloor = 10) {
        this.elevatorId = elevatorId;
        this.minFloor = minFloor;
        this.maxFloor = maxFloor;
        this.currentFloor = 1;
        this.direction = Direction.IDLE;
        this.doorState = DoorState.CLOSED;
        this.floorRequests = []; // Internal requests
        this.hallRequests = []; // External requests
        this.isMoving = false;
        this.capacity = 8;
        this.currentPassengers = 0;
        
        // Timing configurations (in milliseconds for demo, but shown as seconds)
        this.floorTravelTime = 2000; // 2 seconds per floor
        this.doorOperationTime = 1500; // 1.5 seconds to open/close
        this.stopTime = 3000; // 3 seconds door open time
    }

    /**
     * Internal request from inside the elevator
     * @param {number} floor - Target floor number
     * @returns {boolean} - True if request is valid and added
     */
    requestFloor(floor) {
        if (!this._isValidFloor(floor)) {
            console.log(`Elevator ${this.elevatorId}: Invalid floor ${floor}`);
            return false;
        }
        
        if (floor === this.currentFloor && this.doorState === DoorState.CLOSED) {
            console.log(`Elevator ${this.elevatorId}: Already at floor ${floor}`);
            return true;
        }
        
        if (!this.floorRequests.includes(floor)) {
            this.floorRequests.push(floor);
            this.floorRequests.sort((a, b) => a - b);
            console.log(`Elevator ${this.elevatorId}: Floor ${floor} requested from inside`);
        }
        
        return true;
    }

    /**
     * External request from hall call button
     * @param {number} floor - Floor where elevator is called
     * @param {number} direction - Desired direction (UP/DOWN)
     * @returns {boolean} - True if request is valid and added
     */
    callElevator(floor, direction) {
        if (!this._isValidFloor(floor)) {
            console.log(`Elevator ${this.elevatorId}: Invalid floor ${floor}`);
            return false;
        }
        
        // Don't allow UP from top floor or DOWN from bottom floor
        if ((floor === this.maxFloor && direction === Direction.UP) ||
            (floor === this.minFloor && direction === Direction.DOWN)) {
            console.log(`Elevator ${this.elevatorId}: Invalid direction ${Direction.getName(direction)} from floor ${floor}`);
            return false;
        }
        
        // Check if request already exists
        const existingRequest = this.hallRequests.find(
            req => req.floor === floor && req.direction === direction
        );
        
        if (!existingRequest) {
            const request = new FloorRequest(floor, direction);
            this.hallRequests.push(request);
            console.log(`Elevator ${this.elevatorId}: Called to floor ${floor} going ${Direction.getName(direction)}`);
        }
        
        return true;
    }

    /**
     * Check if floor is within valid range
     * @private
     */
    _isValidFloor(floor) {
        return floor >= this.minFloor && floor <= this.maxFloor;
    }

    /**
     * Determine next floor to visit using SCAN algorithm
     * @private
     * @returns {number|null} - Next floor to visit or null if no requests
     */
    _getNextDestination() {
        const allFloors = new Set(this.floorRequests);
        
        // Add hall requests that match our current direction or are at current floor
        for (const request of this.hallRequests) {
            if (this.direction === Direction.IDLE ||
                request.direction === this.direction ||
                request.floor === this.currentFloor ||
                (this.direction === Direction.UP && request.floor > this.currentFloor) ||
                (this.direction === Direction.DOWN && request.floor < this.currentFloor)) {
                allFloors.add(request.floor);
            }
        }
        
        if (allFloors.size === 0) {
            return null;
        }
        
        const floorsArray = Array.from(allFloors);
        
        if (this.direction === Direction.UP || this.direction === Direction.IDLE) {
            // Find next floor going up
            const upFloors = floorsArray.filter(f => f > this.currentFloor);
            if (upFloors.length > 0) {
                return Math.min(...upFloors);
            }
        }
        
        if (this.direction === Direction.DOWN || this.direction === Direction.IDLE) {
            // Find next floor going down
            const downFloors = floorsArray.filter(f => f < this.currentFloor);
            if (downFloors.length > 0) {
                return Math.max(...downFloors);
            }
        }
        
        // If no floors in current direction, find closest
        if (this.direction !== Direction.IDLE && floorsArray.length > 0) {
            return floorsArray.reduce((closest, current) => 
                Math.abs(current - this.currentFloor) < Math.abs(closest - this.currentFloor) 
                    ? current : closest
            );
        }
        
        return null;
    }

    /**
     * Update elevator direction based on destination
     * @private
     */
    _updateDirection(destination) {
        if (destination > this.currentFloor) {
            this.direction = Direction.UP;
        } else if (destination < this.currentFloor) {
            this.direction = Direction.DOWN;
        } else {
            this.direction = Direction.IDLE;
        }
    }

    /**
     * Remove completed requests for the given floor
     * @private
     */
    _removeCompletedRequests(floor) {
        // Remove internal requests
        const floorIndex = this.floorRequests.indexOf(floor);
        if (floorIndex !== -1) {
            this.floorRequests.splice(floorIndex, 1);
        }
        
        // Remove hall requests that can be served
        this.hallRequests = this.hallRequests.filter(
            req => !(req.floor === floor && 
                    (req.direction === this.direction || this.direction === Direction.IDLE))
        );
    }

    /**
     * Simulate opening elevator doors
     * @private
     */
    async _openDoors() {
        console.log(`Elevator ${this.elevatorId}: Opening doors at floor ${this.currentFloor}`);
        this.doorState = DoorState.OPENING;
        await this._wait(this.doorOperationTime);
        this.doorState = DoorState.OPEN;
        console.log(`Elevator ${this.elevatorId}: Doors open at floor ${this.currentFloor}`);
    }

    /**
     * Simulate closing elevator doors
     * @private
     */
    async _closeDoors() {
        console.log(`Elevator ${this.elevatorId}: Closing doors at floor ${this.currentFloor}`);
        this.doorState = DoorState.CLOSING;
        await this._wait(this.doorOperationTime);
        this.doorState = DoorState.CLOSED;
        console.log(`Elevator ${this.elevatorId}: Doors closed at floor ${this.currentFloor}`);
    }

    /**
     * Async wait function
     * @private
     */
    async _wait(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    /**
     * Move elevator to target floor
     * @private
     */
    async _moveToFloor(targetFloor) {
        if (targetFloor === this.currentFloor) {
            return;
        }
        
        this._updateDirection(targetFloor);
        const floorsToTravel = Math.abs(targetFloor - this.currentFloor);
        const travelTime = floorsToTravel * this.floorTravelTime;
        
        console.log(`Elevator ${this.elevatorId}: Moving ${Direction.getName(this.direction)} from floor ${this.currentFloor} to ${targetFloor}`);
        this.isMoving = true;
        
        // Simulate movement
        await this._wait(travelTime);
        
        this.currentFloor = targetFloor;
        this.isMoving = false;
        console.log(`Elevator ${this.elevatorId}: Arrived at floor ${this.currentFloor}`);
    }

    /**
     * Run one elevator cycle
     * @returns {boolean} - True if there was work to do
     */
    async runCycle() {
        const destination = this._getNextDestination();
        
        if (destination === null) {
            this.direction = Direction.IDLE;
            return false;
        }
        
        // Move to destination
        await this._moveToFloor(destination);
        
        // Open doors
        await this._openDoors();
        
        // Wait for passengers
        await this._wait(this.stopTime);
        
        // Remove completed requests
        this._removeCompletedRequests(destination);
        
        // Close doors
        await this._closeDoors();
        
        return true;
    }

    /**
     * Get current elevator status
     * @returns {Object} - Current status object
     */
    getStatus() {
        return {
            elevatorId: this.elevatorId,
            currentFloor: this.currentFloor,
            direction: Direction.getName(this.direction),
            doorState: this.doorState,
            isMoving: this.isMoving,
            floorRequests: [...this.floorRequests],
            hallRequests: this.hallRequests.map(req => ({
                floor: req.floor,
                direction: Direction.getName(req.direction)
            })),
            currentPassengers: this.currentPassengers,
            capacity: this.capacity
        };
    }
}

class ElevatorController {
    /**
     * Controls multiple elevators in a building
     */
    constructor(numElevators = 2, minFloor = 1, maxFloor = 10) {
        this.elevators = [];
        for (let i = 0; i < numElevators; i++) {
            this.elevators.push(new Elevator(i + 1, minFloor, maxFloor));
        }
        this.minFloor = minFloor;
        this.maxFloor = maxFloor;
    }

    /**
     * Call the most appropriate elevator
     * Uses simple distance-based algorithm
     */
    callElevator(floor, direction) {
        if (floor < this.minFloor || floor > this.maxFloor) {
            return false;
        }
        
        // Find the best elevator (closest, same direction preferred)
        let bestElevator = null;
        let bestScore = Infinity;
        
        for (const elevator of this.elevators) {
            let score = Math.abs(elevator.currentFloor - floor);
            
            // Bonus for elevators going in the same direction
            if (elevator.direction === direction) {
                score -= 2;
            }
            
            // Penalty for elevators that are busy
            if (elevator.isMoving || elevator.floorRequests.length > 0 || elevator.hallRequests.length > 0) {
                score += 1;
            }
            
            if (score < bestScore) {
                bestScore = score;
                bestElevator = elevator;
            }
        }
        
        if (bestElevator) {
            return bestElevator.callElevator(floor, direction);
        }
        
        return false;
    }

    /**
     * Get status of all elevators
     */
    getSystemStatus() {
        return this.elevators.map(elevator => elevator.getStatus());
    }
}

// Demo and Testing
async function demoElevatorSystem() {
    console.log('=== Elevator System Demo ===\n');
    
    // Create elevator controller with 2 elevators, floors 1-10
    const controller = new ElevatorController(2, 1, 10);
    
    // Get references to elevators for direct control
    const elevator1 = controller.elevators[0];
    const elevator2 = controller.elevators[1];
    
    console.log('Initial Status:');
    for (const status of controller.getSystemStatus()) {
        console.log(`Elevator ${status.elevatorId}: Floor ${status.currentFloor}, ${status.direction}, Doors ${status.doorState}`);
    }
    console.log();
    
    // Simulate some requests
    console.log('=== Simulation Starting ===');
    
    // Someone on floor 5 wants to go up
    controller.callElevator(5, Direction.UP);
    
    // Someone on floor 8 wants to go down
    controller.callElevator(8, Direction.DOWN);
    
    // Internal requests
    elevator1.requestFloor(7);
    elevator1.requestFloor(3);
    
    // Run simulation for several cycles
    for (let cycle = 0; cycle < 10; cycle++) {
        console.log(`\n--- Cycle ${cycle + 1} ---`);
        
        // Run each elevator
        const tasks = controller.elevators.map(elevator => elevator.runCycle());
        
        // Wait for all elevators to complete their cycles
        const results = await Promise.all(tasks);
        
        // Check if any elevator had work to do
        if (!results.some(result => result)) {
            console.log('All elevators idle - simulation complete');
            break;
        }
        
        // Show status
        for (const status of controller.getSystemStatus()) {
            const requestsStr = `Internal: [${status.floorRequests.join(', ')}], Hall: [${status.hallRequests.map(r => `${r.floor}${r.direction}`).join(', ')}]`;
            console.log(`Elevator ${status.elevatorId}: Floor ${status.currentFloor}, ${status.direction}, ${requestsStr}`);
        }
    }
}

// Interactive testing function
function createInteractiveDemo() {
    const controller = new ElevatorController(3, 1, 15);
    
    return {
        // Call elevator to a floor
        call: (floor, direction = 'UP') => {
            const dir = direction === 'UP' ? Direction.UP : Direction.DOWN;
            controller.callElevator(floor, dir);
            console.log(`Called elevator to floor ${floor} going ${direction}`);
        },
        
        // Request floor from inside elevator
        request: (elevatorId, floor) => {
            const elevator = controller.elevators[elevatorId - 1];
            if (elevator) {
                elevator.requestFloor(floor);
            } else {
                console.log(`Elevator ${elevatorId} not found`);
            }
        },
        
        // Run simulation
        run: async (cycles = 5) => {
            for (let i = 0; i < cycles; i++) {
                console.log(`\n--- Cycle ${i + 1} ---`);
                const tasks = controller.elevators.map(e => e.runCycle());
                const results = await Promise.all(tasks);
                
                if (!results.some(r => r)) {
                    console.log('All elevators idle');
                    break;
                }
                
                // Show status
                controller.getSystemStatus().forEach(status => {
                    console.log(`Elevator ${status.elevatorId}: Floor ${status.currentFloor}, ${status.direction}`);
                });
            }
        },
        
        // Get current status
        status: () => {
            return controller.getSystemStatus();
        },
        
        controller: controller
    };
}

// Main execution
async function main() {
    console.log('🏢 JavaScript Elevator Simulation Starting...\n');
    
    // Run the demo
    await demoElevatorSystem();
    
    console.log('\n=== Demo Complete ===');
    console.log('\n💡 Interactive Mode Available:');
    console.log('If running in Node.js REPL or browser console, you can use:');
    console.log('const demo = createInteractiveDemo();');
    console.log('demo.call(5, "UP");        // Call elevator to floor 5 going up');
    console.log('demo.request(1, 8);        // Request floor 8 from elevator 1');
    console.log('await demo.run();          // Run simulation');
    console.log('demo.status();             // Get current status');
    
    // Make interactive demo available globally
    if (typeof global !== 'undefined') {
        global.createInteractiveDemo = createInteractiveDemo;
        global.Direction = Direction;
        global.DoorState = DoorState;
    } else if (typeof window !== 'undefined') {
        window.createInteractiveDemo = createInteractiveDemo;
        window.Direction = Direction;
        window.DoorState = DoorState;
    }
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Elevator,
        ElevatorController,
        Direction,
        DoorState,
        FloorRequest,
        demoElevatorSystem,
        createInteractiveDemo
    };
}

// Run if this is the main file
if (typeof require !== 'undefined' && require.main === module) {
    main().catch(console.error);
} else if (typeof window !== 'undefined') {
    // Browser environment - run automatically
    main().catch(console.error);
}