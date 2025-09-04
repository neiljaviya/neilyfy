# Comprehensive Technical Interview Preparation Guide for Junior Software Engineer at Aviva Canada

## Part 1: Core Java - Deep Theoretical Foundations with Examples

### 1.1 Object-Oriented Programming (OOP) - Complete Theory and Practice

#### Understanding Encapsulation

**Theoretical Foundation:**
Encapsulation is the fundamental OOP principle that bundles data (attributes) and methods (behaviors) that operate on that data within a single unit called a class. It implements data hiding by restricting direct access to some of an object's components, which is a means of preventing accidental interference and misuse of the methods and data.

The principle operates on two core mechanisms:
1. **Data Hiding**: Internal representation of an object is hidden from the outside world
2. **Access Control**: Public methods provide controlled ways to access and modify the private data

**Why Encapsulation Matters:**
- **Security**: Sensitive data is hidden from external access
- **Flexibility**: Internal implementation can change without affecting external code
- **Maintainability**: Clear interfaces make code easier to understand and modify
- **Control**: Validation logic can be enforced when data is accessed or modified

```java
public class BankAccount {
    // Private fields - hidden from external access
    private double balance;
    private String accountNumber;
    private String accountHolderName;
    private List<Transaction> transactionHistory;
    
    // Constructor - controls initial object creation
    public BankAccount(String accountNumber, String holderName, double initialDeposit) {
        if (initialDeposit < 0) {
            throw new IllegalArgumentException("Initial deposit cannot be negative");
        }
        this.accountNumber = accountNumber;
        this.accountHolderName = holderName;
        this.balance = initialDeposit;
        this.transactionHistory = new ArrayList<>();
        logTransaction("INITIAL_DEPOSIT", initialDeposit);
    }
    
    // Public methods provide controlled access
    public boolean withdraw(double amount) {
        // Validation logic encapsulated within the class
        if (amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive");
        }
        if (amount > balance) {
            return false; // Insufficient funds
        }
        
        // Business logic hidden from external users
        balance -= amount;
        logTransaction("WITHDRAWAL", amount);
        return true;
    }
    
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }
        balance += amount;
        logTransaction("DEPOSIT", amount);
    }
    
    // Read-only access to balance - no direct modification possible
    public double getBalance() {
        return balance;
    }
    
    // Private helper method - completely hidden from external access
    private void logTransaction(String type, double amount) {
        Transaction transaction = new Transaction(type, amount, LocalDateTime.now());
        transactionHistory.add(transaction);
    }
    
    // Controlled access to transaction history - returns copy to prevent external modification
    public List<Transaction> getTransactionHistory() {
        return new ArrayList<>(transactionHistory);
    }
}
```

**Interview Key Points:**
- Encapsulation is achieved through access modifiers (private, protected, public, package-private)
- It promotes loose coupling between classes
- Getters and setters provide controlled access but should not be blindly added for every field
- Immutable objects are the ultimate form of encapsulation

#### Understanding Inheritance

**Theoretical Foundation:**
Inheritance is the mechanism by which one class (child/derived/subclass) acquires the properties and behaviors of another class (parent/base/superclass). It represents an "IS-A" relationship and is fundamental to code reusability and polymorphic behavior.

**Types of Inheritance in Java:**
1. **Single Inheritance**: A class extends one parent class (Java supports this)
2. **Multiple Inheritance**: A class extends multiple classes (Java doesn't support this directly, uses interfaces instead)
3. **Multilevel Inheritance**: A chain of inheritance (A → B → C)
4. **Hierarchical Inheritance**: Multiple classes inherit from one parent
5. **Hybrid Inheritance**: Combination of above (through interfaces in Java)

```java
// Base class demonstrating inheritance theory
public abstract class Employee {
    // Protected allows access in subclasses
    protected String employeeId;
    protected String name;
    protected double baseSalary;
    protected LocalDate joinDate;
    
    // Constructor chaining in inheritance
    public Employee(String employeeId, String name, double baseSalary) {
        this.employeeId = employeeId;
        this.name = name;
        this.baseSalary = baseSalary;
        this.joinDate = LocalDate.now();
    }
    
    // Abstract method - forces implementation in subclasses
    public abstract double calculateTotalCompensation();
    
    // Concrete method - inherited by all subclasses
    public int getYearsOfService() {
        return Period.between(joinDate, LocalDate.now()).getYears();
    }
    
    // Final method - cannot be overridden
    public final String getEmployeeId() {
        return employeeId;
    }
    
    // Protected method - available to subclasses
    protected double calculateBonus() {
        return baseSalary * 0.1 * getYearsOfService();
    }
}

// Concrete implementation demonstrating single inheritance
public class SoftwareEngineer extends Employee {
    private String programmingLanguage;
    private int linesOfCodeWritten;
    private List<String> certifications;
    
    public SoftwareEngineer(String employeeId, String name, double baseSalary, 
                           String programmingLanguage) {
        super(employeeId, name, baseSalary); // Must call parent constructor
        this.programmingLanguage = programmingLanguage;
        this.certifications = new ArrayList<>();
    }
    
    // Implementation of abstract method - mandatory
    @Override
    public double calculateTotalCompensation() {
        double bonus = calculateBonus(); // Using protected parent method
        double certificationBonus = certifications.size() * 1000;
        double performanceBonus = (linesOfCodeWritten / 1000) * 100;
        return baseSalary + bonus + certificationBonus + performanceBonus;
    }
    
    // Additional methods specific to SoftwareEngineer
    public void addCertification(String certification) {
        certifications.add(certification);
    }
    
    // Overriding parent method with enhanced functionality
    @Override
    protected double calculateBonus() {
        // Calling parent implementation and adding engineer-specific logic
        double baseBonus = super.calculateBonus();
        double languageBonus = programmingLanguage.equals("Java") ? 2000 : 1000;
        return baseBonus + languageBonus;
    }
}

// Demonstrating multilevel inheritance
public class SeniorSoftwareEngineer extends SoftwareEngineer {
    private List<String> mentees;
    private int architectureDesignsCreated;
    
    public SeniorSoftwareEngineer(String employeeId, String name, double baseSalary,
                                  String programmingLanguage) {
        super(employeeId, name, baseSalary, programmingLanguage);
        this.mentees = new ArrayList<>();
    }
    
    @Override
    public double calculateTotalCompensation() {
        double engineerCompensation = super.calculateTotalCompensation();
        double mentorshipBonus = mentees.size() * 500;
        double architectureBonus = architectureDesignsCreated * 1500;
        return engineerCompensation + mentorshipBonus + architectureBonus;
    }
}
```

**Key Inheritance Concepts:**
- **Constructor Chaining**: Child class constructors must invoke parent constructors
- **Method Overriding**: Subclasses can provide specific implementations
- **super Keyword**: References immediate parent class
- **final Keyword**: Prevents inheritance (class) or overriding (method)
- **abstract Classes**: Cannot be instantiated, may contain abstract methods

#### Understanding Polymorphism

**Theoretical Foundation:**
Polymorphism, meaning "many forms," allows objects of different types to be treated uniformly. Java implements two types:

1. **Compile-Time Polymorphism (Static)**: Method overloading, resolved during compilation
2. **Runtime Polymorphism (Dynamic)**: Method overriding, resolved during execution

**The Mechanism Behind Polymorphism:**
- Based on dynamic method dispatch
- JVM determines which method to invoke at runtime based on actual object type
- Enables flexible and extensible code design

```java
// Comprehensive polymorphism example
public class PaymentProcessor {
    
    // Method overloading - compile-time polymorphism
    public void processPayment(double amount) {
        System.out.println("Processing cash payment: $" + amount);
    }
    
    public void processPayment(double amount, String cardNumber) {
        System.out.println("Processing card payment: $" + amount);
        validateCard(cardNumber);
    }
    
    public void processPayment(double amount, String accountNumber, String routingNumber) {
        System.out.println("Processing ACH payment: $" + amount);
        validateBankAccount(accountNumber, routingNumber);
    }
    
    private void validateCard(String cardNumber) {
        // Card validation logic
    }
    
    private void validateBankAccount(String accountNumber, String routingNumber) {
        // Bank account validation logic
    }
}

// Runtime polymorphism demonstration
public abstract class Shape {
    protected String color;
    
    public Shape(String color) {
        this.color = color;
    }
    
    // Abstract methods for polymorphic behavior
    public abstract double calculateArea();
    public abstract double calculatePerimeter();
    
    // Concrete method shared by all shapes
    public void display() {
        System.out.println("Shape: " + this.getClass().getSimpleName());
        System.out.println("Color: " + color);
        System.out.println("Area: " + calculateArea());
        System.out.println("Perimeter: " + calculatePerimeter());
    }
}

public class Rectangle extends Shape {
    private double width;
    private double height;
    
    public Rectangle(String color, double width, double height) {
        super(color);
        this.width = width;
        this.height = height;
    }
    
    @Override
    public double calculateArea() {
        return width * height;
    }
    
    @Override
    public double calculatePerimeter() {
        return 2 * (width + height);
    }
}

public class Circle extends Shape {
    private double radius;
    
    public Circle(String color, double radius) {
        super(color);
        this.radius = radius;
    }
    
    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
    
    @Override
    public double calculatePerimeter() {
        return 2 * Math.PI * radius;
    }
}

// Demonstrating polymorphic behavior
public class ShapeCalculator {
    public static void main(String[] args) {
        // Polymorphic array - different shapes treated uniformly
        Shape[] shapes = {
            new Rectangle("Red", 5, 10),
            new Circle("Blue", 7),
            new Rectangle("Green", 3, 4)
        };
        
        // Polymorphic method invocation
        for (Shape shape : shapes) {
            shape.display(); // Actual method called depends on runtime type
            System.out.println("---");
        }
        
        // Polymorphic method parameter
        processShape(new Circle("Yellow", 5));
    }
    
    // Method accepts any Shape subtype
    public static void processShape(Shape shape) {
        System.out.println("Processing shape with area: " + shape.calculateArea());
    }
}
```

#### Understanding Abstraction

**Theoretical Foundation:**
Abstraction is the process of hiding implementation details while showing only essential features of an object. It's achieved through abstract classes and interfaces, focusing on "what" an object does rather than "how" it does it.

**Levels of Abstraction:**
1. **Data Abstraction**: Hiding internal data representation
2. **Control Abstraction**: Hiding implementation of business logic
3. **Procedural Abstraction**: Hiding complex operations behind simple method calls

```java
// Abstract class demonstrating abstraction concept
public abstract class DatabaseConnection {
    protected String connectionString;
    protected int maxPoolSize;
    protected boolean isConnected;
    
    public DatabaseConnection(String connectionString, int maxPoolSize) {
        this.connectionString = connectionString;
        this.maxPoolSize = maxPoolSize;
        this.isConnected = false;
    }
    
    // Abstract methods define what operations are needed without implementation
    public abstract void connect();
    public abstract void disconnect();
    public abstract ResultSet executeQuery(String query);
    public abstract int executeUpdate(String query);
    
    // Concrete method providing common functionality
    public void executeTransaction(List<String> queries) {
        if (!isConnected) {
            connect();
        }
        
        try {
            beginTransaction();
            for (String query : queries) {
                executeUpdate(query);
            }
            commitTransaction();
        } catch (Exception e) {
            rollbackTransaction();
            throw new RuntimeException("Transaction failed", e);
        }
    }
    
    // Template method pattern - defines algorithm structure
    protected abstract void beginTransaction();
    protected abstract void commitTransaction();
    protected abstract void rollbackTransaction();
}

// Concrete implementation hiding complex details
public class MySQLConnection extends DatabaseConnection {
    private Connection connection;
    
    public MySQLConnection(String connectionString, int maxPoolSize) {
        super(connectionString, maxPoolSize);
    }
    
    @Override
    public void connect() {
        // Complex connection logic hidden from users
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            connection = DriverManager.getConnection(connectionString);
            isConnected = true;
        } catch (Exception e) {
            throw new RuntimeException("Failed to connect to MySQL", e);
        }
    }
    
    @Override
    public void disconnect() {
        // Implementation details abstracted away
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                isConnected = false;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to disconnect", e);
        }
    }
    
    // Additional implementation methods...
}

// Interface abstraction - pure abstraction
public interface PaymentGateway {
    // Interface defines contract without any implementation
    PaymentResult processPayment(PaymentRequest request);
    PaymentStatus checkPaymentStatus(String transactionId);
    RefundResult processRefund(String transactionId, double amount);
    
    // Default methods (Java 8+) provide base implementation
    default boolean validatePaymentRequest(PaymentRequest request) {
        return request != null && 
               request.getAmount() > 0 && 
               request.getCurrency() != null;
    }
}
```

### 1.2 Java Collections Framework - Complete Understanding

#### The Architecture of Collections

**Theoretical Foundation:**
The Java Collections Framework provides a unified architecture for representing and manipulating collections. It includes interfaces, implementations, and algorithms designed to be high-performance, high-quality implementations of useful data structures and algorithms.

**Core Interfaces Hierarchy:**
```
Collection (root interface)
├── List (ordered, allows duplicates)
│   ├── ArrayList
│   ├── LinkedList
│   └── Vector
├── Set (no duplicates)
│   ├── HashSet
│   ├── LinkedHashSet
│   └── TreeSet (SortedSet)
└── Queue (FIFO processing)
    ├── PriorityQueue
    ├── Deque
    └── LinkedList

Map (key-value pairs, separate hierarchy)
├── HashMap
├── LinkedHashMap
├── TreeMap (SortedMap)
└── HashTable
```

#### ArrayList Deep Dive

**Internal Working:**
ArrayList internally uses a dynamic array to store elements. When the array becomes full, a new array of 1.5x the current size is created, and elements are copied over.

```java
public class ArrayListInternals {
    public static void demonstrateArrayList() {
        // Initial capacity is 10 by default
        ArrayList<String> list = new ArrayList<>();
        
        // Or specify initial capacity
        ArrayList<String> optimizedList = new ArrayList<>(100);
        
        // Adding elements - O(1) amortized time
        list.add("First");  // Index 0
        list.add("Second"); // Index 1
        list.add("Third");  // Index 2
        
        // Insertion at specific index - O(n) due to shifting
        list.add(1, "Inserted"); // Shifts "Second" and "Third"
        
        // Access by index - O(1) due to array indexing
        String element = list.get(2); // Direct array access
        
        // Demonstrating capacity growth
        System.out.println("Size: " + list.size());        // Actual elements
        // Capacity is internal, but grows as: 10 -> 15 -> 22 -> 33...
        
        // Removal - O(n) due to shifting elements
        list.remove(1); // Removes "Inserted", shifts remaining elements
        
        // Iteration options
        // 1. Traditional for loop - best for index-based operations
        for (int i = 0; i < list.size(); i++) {
            System.out.println(list.get(i));
        }
        
        // 2. Enhanced for loop - cleaner syntax
        for (String item : list) {
            System.out.println(item);
        }
        
        // 3. Iterator - safe for removal during iteration
        Iterator<String> iterator = list.iterator();
        while (iterator.hasNext()) {
            String item = iterator.next();
            if (item.startsWith("F")) {
                iterator.remove(); // Safe removal
            }
        }
        
        // 4. Java 8 Stream API
        list.stream()
            .filter(s -> s.length() > 5)
            .forEach(System.out::println);
    }
}
```

**When to Use ArrayList:**
- Frequent access by index
- Adding elements at the end
- Relatively static size after initial population
- Need cache locality for better performance

**When to Avoid ArrayList:**
- Frequent insertions/deletions in the middle
- Unknown size with frequent growth
- Need thread safety (use Vector or Collections.synchronizedList)

#### HashMap Deep Dive

**Internal Working:**
HashMap uses an array of buckets where each bucket is a linked list (or tree for Java 8+ when collision count exceeds threshold). Hash function determines bucket index.

```java
public class HashMapInternals {
    public static void demonstrateHashMap() {
        // Initial capacity 16, load factor 0.75
        HashMap<String, Integer> map = new HashMap<>();
        
        // How put() works internally:
        // 1. Calculate hash of key
        // 2. Find bucket index: index = hash & (capacity - 1)
        // 3. Check if key exists in bucket
        // 4. Add/update entry
        map.put("John", 25);    // Hash("John") -> Bucket 3
        map.put("Jane", 30);    // Hash("Jane") -> Bucket 7
        map.put("Bob", 28);     // Hash("Bob") -> Bucket 3 (collision!)
        
        // Collision handling - entries form linked list in bucket
        // Java 8+: Converts to balanced tree if bucket size > 8
        
        // Retrieval process - O(1) average case
        Integer age = map.get("John");
        // 1. Calculate hash of "John"
        // 2. Find bucket index
        // 3. Search linked list/tree in bucket
        // 4. Return value if found
        
        // Load factor and rehashing
        // When size > capacity * loadFactor, resize occurs
        // New capacity = old capacity * 2
        // All entries are rehashed to new buckets
        
        // Iteration over HashMap
        // 1. Iterate over entries
        for (Map.Entry<String, Integer> entry : map.entrySet()) {
            System.out.println(entry.getKey() + ": " + entry.getValue());
        }
        
        // 2. Iterate over keys
        for (String key : map.keySet()) {
            System.out.println(key + ": " + map.get(key));
        }
        
        // 3. Iterate over values
        for (Integer value : map.values()) {
            System.out.println("Age: " + value);
        }
        
        // 4. Java 8 forEach
        map.forEach((key, value) -> 
            System.out.println(key + " is " + value + " years old"));
        
        // Null handling
        map.put(null, 35);      // Allowed - one null key
        map.put("Tom", null);   // Allowed - multiple null values
        
        // Java 8 helpful methods
        map.putIfAbsent("Alice", 27);  // Only puts if key doesn't exist
        map.computeIfAbsent("David", k -> calculateAge(k));
        map.merge("John", 1, (oldVal, newVal) -> oldVal + newVal);
        
        // Thread-safe alternatives
        Map<String, Integer> synchronizedMap = Collections.synchronizedMap(map);
        Map<String, Integer> concurrentMap = new ConcurrentHashMap<>();
    }
    
    private static Integer calculateAge(String name) {
        // Some calculation logic
        return name.length() * 3;
    }
}
```

**Key Concepts for HashMap:**
- **Hash Function**: Distributes keys uniformly across buckets
- **Load Factor**: Threshold for resizing (default 0.75)
- **Collision Resolution**: Chaining (linked list/tree)
- **Rehashing**: Expensive operation when capacity doubles
- **Iteration Order**: Not guaranteed (use LinkedHashMap for insertion order)

#### Choosing the Right Collection

**Decision Matrix:**

```java
public class CollectionSelector {
    
    // List implementations comparison
    public void chooseList() {
        // ArrayList - Dynamic array
        // Pros: Fast random access O(1), cache-friendly
        // Cons: Slow insertion/deletion in middle O(n)
        // Use: When you need indexed access, mostly appending
        List<String> arrayList = new ArrayList<>();
        
        // LinkedList - Doubly-linked list
        // Pros: Fast insertion/deletion at any position O(1) if you have the node
        // Cons: Slow random access O(n), more memory per element
        // Use: When frequent insertion/deletion, queue operations
        List<String> linkedList = new LinkedList<>();
        
        // Vector - Synchronized ArrayList
        // Pros: Thread-safe
        // Cons: Slower due to synchronization overhead
        // Use: Legacy code, prefer ArrayList with synchronization wrapper
        List<String> vector = new Vector<>();
    }
    
    // Set implementations comparison
    public void chooseSet() {
        // HashSet - Hash table
        // Pros: O(1) operations, best performance
        // Cons: No ordering
        // Use: When you need unique elements, no ordering required
        Set<String> hashSet = new HashSet<>();
        
        // LinkedHashSet - Hash table + linked list
        // Pros: O(1) operations, maintains insertion order
        // Cons: Slightly more memory than HashSet
        // Use: When you need unique elements with insertion order
        Set<String> linkedHashSet = new LinkedHashSet<>();
        
        // TreeSet - Red-black tree
        // Pros: Sorted order, NavigableSet operations
        // Cons: O(log n) operations
        // Use: When you need sorted unique elements
        Set<String> treeSet = new TreeSet<>();
    }
    
    // Map implementations comparison
    public void chooseMap() {
        // HashMap - Hash table
        // Pros: O(1) operations, allows null key/values
        // Cons: No ordering, not thread-safe
        // Use: General purpose, best performance
        Map<String, String> hashMap = new HashMap<>();
        
        // TreeMap - Red-black tree
        // Pros: Sorted by keys, NavigableMap operations
        // Cons: O(log n) operations
        // Use: When you need sorted keys
        Map<String, String> treeMap = new TreeMap<>();
        
        // LinkedHashMap - Hash table + linked list
        // Pros: Maintains insertion or access order
        // Cons: Slightly more memory
        // Use: LRU cache implementation, predictable iteration
        Map<String, String> linkedHashMap = new LinkedHashMap<>();
        
        // ConcurrentHashMap - Segmented hash table
        // Pros: Thread-safe, better concurrency than Hashtable
        // Cons: No null keys/values
        // Use: Concurrent applications
        Map<String, String> concurrentHashMap = new ConcurrentHashMap<>();
    }
}
```

### 1.3 Multithreading and Concurrency - Complete Theory

#### Thread Lifecycle and States

**Theoretical Foundation:**
A thread in Java goes through various states during its lifecycle. Understanding these states is crucial for debugging and designing concurrent applications.

**Thread States:**
1. **NEW**: Thread created but not started
2. **RUNNABLE**: Executing or ready to execute
3. **BLOCKED**: Waiting to acquire a lock
4. **WAITING**: Waiting indefinitely for another thread
5. **TIMED_WAITING**: Waiting for specified time
6. **TERMINATED**: Thread has completed execution

```java
public class ThreadLifecycle {
    
    public static void demonstrateThreadStates() throws InterruptedException {
        // NEW state
        Thread thread = new Thread(() -> {
            System.out.println("Thread is running");
        });
        System.out.println("State after creation: " + thread.getState()); // NEW
        
        // RUNNABLE state
        thread.start();
        System.out.println("State after start: " + thread.getState()); // RUNNABLE
        
        // BLOCKED state demonstration
        Object lock = new Object();
        Thread t1 = new Thread(() -> {
            synchronized (lock) {
                try {
                    Thread.sleep(5000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });
        
        Thread t2 = new Thread(() -> {
            synchronized (lock) {
                System.out.println("T2 acquired lock");
            }
        });
        
        t1.start();
        Thread.sleep(100); // Ensure t1 gets lock first
        t2.start();
        Thread.sleep(100);
        System.out.println("T2 state: " + t2.getState()); // BLOCKED
        
        // WAITING state demonstration
        Thread waitingThread = new Thread(() -> {
            synchronized (lock) {
                try {
                    lock.wait(); // Wait indefinitely
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });
        
        waitingThread.start();
        Thread.sleep(100);
        System.out.println("Waiting thread state: " + waitingThread.getState()); // WAITING
        
        // TIMED_WAITING state
        Thread timedWaitingThread = new Thread(() -> {
            try {
                Thread.sleep(3000); // Sleep for 3 seconds
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        
        timedWaitingThread.start();
        Thread.sleep(100);
        System.out.println("Timed waiting state: " + timedWaitingThread.getState()); // TIMED_WAITING
        
        // TERMINATED state
        thread.join(); // Wait for thread to complete
        System.out.println("State after completion: " + thread.getState()); // TERMINATED
    }
}
```

#### Synchronization Mechanisms

**Theoretical Foundation:**
Synchronization ensures that only one thread can access a shared resource at a time, preventing race conditions and maintaining data consistency.

**Types of Synchronization:**

```java
public class SynchronizationMechanisms {
    private int counter = 0;
    private final Object lockObject = new Object();
    
    // 1. Synchronized method - locks on 'this' object
    public synchronized void incrementSync() {
        counter++;
        // Only one thread can execute this method at a time
    }
    
    // 2. Synchronized block - more granular control
    public void incrementWithBlock() {
        System.out.println("Non-synchronized code");
        
        synchronized (lockObject) {
            // Critical section
            counter++;
        }
        
        System.out.println("More non-synchronized code");
    }
    
    // 3. Static synchronization - class-level lock
    private static int staticCounter = 0;
    
    public static synchronized void incrementStatic() {
        staticCounter++;
        // Locks on Class object, not instance
    }
    
    // 4. ReentrantLock - explicit locking
    private final ReentrantLock reentrantLock = new ReentrantLock();
    
    public void incrementWithReentrantLock() {
        reentrantLock.lock();
        try {
            counter++;
            // Can call other methods that acquire same lock (reentrant)
            helperMethod();
        } finally {
            reentrantLock.unlock(); // Always unlock in finally
        }
    }
    
    private void helperMethod() {
        reentrantLock.lock(); // Same thread can acquire lock again
        try {
            counter++;
        } finally {
            reentrantLock.unlock();
        }
    }
    
    // 5. ReadWriteLock - separate read and write locks
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private Map<String, String> cache = new HashMap<>();
    
    public String readFromCache(String key) {
        rwLock.readLock().lock();
        try {
            return cache.get(key); // Multiple threads can read
        } finally {
            rwLock.readLock().unlock();
        }
    }
    
    public void writeToCache(String key, String value) {
        rwLock.writeLock().lock();
        try {
            cache.put(key, value); // Exclusive access for writing
        } finally {
            rwLock.writeLock().unlock();
        }
    }
}
```

#### Producer-Consumer Problem

**Theoretical Foundation:**
The producer-consumer problem is a classic synchronization problem where producers generate data and consumers process it, requiring coordination to prevent buffer overflow/underflow.

```java
public class ProducerConsumerPattern {
    
    // Using wait() and notify()
    static class Buffer {
        private Queue<Integer> queue = new LinkedList<>();
        private int capacity;
        
        public Buffer(int capacity) {
            this.capacity = capacity;
        }
        
        public synchronized void produce(int item) throws InterruptedException {
            while (queue.size() == capacity) {
                System.out.println("Buffer full, producer waiting...");
                wait(); // Release lock and wait
            }
            
            queue.add(item);
            System.out.println("Produced: " + item);
            notifyAll(); // Wake up waiting consumers
        }
        
        public synchronized int consume() throws InterruptedException {
            while (queue.isEmpty()) {
                System.out.println("Buffer empty, consumer waiting...");
                wait(); // Release lock and wait
            }
            
            int item = queue.poll();
            System.out.println("Consumed: " + item);
            notifyAll(); // Wake up waiting producers
            return item;
        }
    }
    
    // Using BlockingQueue (preferred approach)
    static class ModernProducerConsumer {
        private BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(10);
        
        public void produce() {
            try {
                for (int i = 0; i < 100; i++) {
                    queue.put(i); // Blocks if queue is full
                    System.out.println("Produced: " + i);
                    Thread.sleep(100);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        public void consume() {
            try {
                while (true) {
                    Integer item = queue.take(); // Blocks if queue is empty
                    System.out.println("Consumed: " + item);
                    Thread.sleep(150);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
    
    // Using Semaphore for bounded buffer
    static class SemaphoreBuffer {
        private Queue<Integer> queue = new LinkedList<>();
        private Semaphore producerSemaphore;
        private Semaphore consumerSemaphore;
        private Semaphore mutex = new Semaphore(1); // For mutual exclusion
        
        public SemaphoreBuffer(int capacity) {
            producerSemaphore = new Semaphore(capacity); // Available spaces
            consumerSemaphore = new Semaphore(0); // Available items
        }
        
        public void produce(int item) throws InterruptedException {
            producerSemaphore.acquire(); // Wait for space
            mutex.acquire(); // Exclusive access to queue
            
            queue.add(item);
            System.out.println("Produced: " + item);
            
            mutex.release();
            consumerSemaphore.release(); // Signal item available
        }
        
        public int consume() throws InterruptedException {
            consumerSemaphore.acquire(); // Wait for item
            mutex.acquire(); // Exclusive access to queue
            
            int item = queue.poll();
            System.out.println("Consumed: " + item);
            
            mutex.release();
            producerSemaphore.release(); // Signal space available
            return item;
        }
    }
}
```

### 1.4 Exception Handling - Complete Theory and Best Practices

#### Exception Hierarchy and Types

**Theoretical Foundation:**
Java's exception handling mechanism provides a robust way to handle runtime errors, maintaining normal flow of the application. The exception hierarchy starts with Throwable class.

```
Throwable
├── Error (System errors, not meant to be caught)
│   ├── VirtualMachineError
│   ├── OutOfMemoryError
│   └── StackOverflowError
└── Exception (Application errors)
    ├── Checked Exceptions (Compile-time)
    │   ├── IOException
    │   ├── SQLException
    │   └── ClassNotFoundException
    └── RuntimeException (Unchecked, Runtime)
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        ├── IllegalArgumentException
        └── NumberFormatException
```

```java
public class ExceptionHandlingComplete {
    
    // Demonstrating checked exception
    public void readFile(String fileName) throws IOException {
        // Must declare throws or handle IOException
        FileReader file = new FileReader(fileName);
        BufferedReader reader = new BufferedReader(file);
        
        try {
            String line;
            while ((line = reader.readLine()) != null) {
                processLine(line);
            }
        } finally {
            // Cleanup code - always executes
            reader.close();
            file.close();
        }
    }
    
    // Try-with-resources (Java 7+) - Automatic resource management
    public void modernFileReading(String fileName) throws IOException {
        // Resources declared in try are auto-closed
        try (FileReader file = new FileReader(fileName);
             BufferedReader reader = new BufferedReader(file)) {
            
            String line;
            while ((line = reader.readLine()) != null) {
                processLine(line);
            }
        } // Resources automatically closed here
    }
    
    // Multiple catch blocks with order importance
    public void demonstrateMultipleCatch(String input) {
        try {
            int value = Integer.parseInt(input);
            int[] array = new int[5];
            array[value] = 10 / value;
        } catch (NumberFormatException e) {
            // Specific exception first
            System.out.println("Invalid number format: " + e.getMessage());
        } catch (ArithmeticException e) {
            // Division by zero
            System.out.println("Arithmetic error: " + e.getMessage());
        } catch (ArrayIndexOutOfBoundsException e) {
            // Array access error
            System.out.println("Array index error: " + e.getMessage());
        } catch (Exception e) {
            // Generic exception last (catch-all)
            System.out.println("Unexpected error: " + e.getMessage());
        }
    }
    
    // Multi-catch (Java 7+)
    public void multiCatchExample(String fileName) {
        try {
            FileInputStream file = new FileInputStream(fileName);
            ObjectInputStream ois = new ObjectInputStream(file);
            Object obj = ois.readObject();
        } catch (IOException | ClassNotFoundException e) {
            // Handle multiple exception types similarly
            System.err.println("Error reading object: " + e);
        }
    }
    
    // Custom exception with best practices
    public static class BusinessValidationException extends Exception {
        private final String errorCode;
        private final Map<String, String> errorDetails;
        
        public BusinessValidationException(String message, String errorCode) {
            super(message);
            this.errorCode = errorCode;
            this.errorDetails = new HashMap<>();
        }
        
        public BusinessValidationException(String message, String errorCode, 
                                          Map<String, String> details, Throwable cause) {
            super(message, cause);
            this.errorCode = errorCode;
            this.errorDetails = details;
        }
        
        public String getErrorCode() {
            return errorCode;
        }
        
        public Map<String, String> getErrorDetails() {
            return new HashMap<>(errorDetails); // Defensive copy
        }
    }
    
    // Exception chaining and wrapping
    public void demonstrateExceptionChaining() {
        try {
            lowLevelOperation();
        } catch (SQLException e) {
            // Wrap low-level exception in business exception
            throw new DataAccessException("Failed to fetch user data", e);
        }
    }
    
    // Finally block behavior
    public String demonstrateFinally() {
        try {
            return "From try";
        } catch (Exception e) {
            return "From catch";
        } finally {
            // This executes even with return statements
            System.out.println("Finally always executes");
            // Don't return from finally - it overrides other returns
        }
    }
    
    // Best practice: Fail fast with validation
    public void processOrder(Order order) {
        // Validate inputs early
        Objects.requireNonNull(order, "Order cannot be null");
        
        if (order.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must have at least one item");
        }
        
        if (order.getTotal() < 0) {
            throw new IllegalStateException("Order total cannot be negative");
        }
        
        // Process valid order
    }
}
```

### 1.5 Java 8+ Features - Complete Understanding

#### Lambda Expressions and Functional Interfaces

**Theoretical Foundation:**
Lambda expressions introduce functional programming to Java, enabling you to treat functionality as method arguments. They're essentially anonymous functions that implement functional interfaces.

**Functional Interface Rules:**
- Must have exactly one abstract method
- Can have multiple default or static methods
- @FunctionalInterface annotation is optional but recommended

```java
// Built-in functional interfaces
public class FunctionalProgrammingComplete {
    
    // 1. Function<T, R> - Takes T, returns R
    public void demonstrateFunction() {
        Function<String, Integer> stringLength = str -> str.length();
        Function<Integer, Integer> doubleValue = x -> x * 2;
        
        // Function composition
        Function<String, Integer> combinedFunction = stringLength.andThen(doubleValue);
        System.out.println(combinedFunction.apply("Hello")); // 10
        
        // Method reference - more concise
        Function<String, Integer> lengthRef = String::length;
    }
    
    // 2. Predicate<T> - Takes T, returns boolean
    public void demonstratePredicate() {
        Predicate<Integer> isEven = n -> n % 2 == 0;
        Predicate<Integer> isPositive = n -> n > 0;
        
        // Predicate combination
        Predicate<Integer> isEvenAndPositive = isEven.and(isPositive);
        Predicate<Integer> isEvenOrNegative = isEven.or(isPositive.negate());
        
        List<Integer> numbers = Arrays.asList(-2, -1, 0, 1, 2, 3, 4);
        List<Integer> filtered = numbers.stream()
            .filter(isEvenAndPositive)
            .collect(Collectors.toList());
    }
    
    // 3. Consumer<T> - Takes T, returns void
    public void demonstrateConsumer() {
        Consumer<String> printer = System.out::println;
        Consumer<String> upperCasePrinter = str -> System.out.println(str.toUpperCase());
        
        // Consumer chaining
        Consumer<String> combinedConsumer = printer.andThen(upperCasePrinter);
        combinedConsumer.accept("hello"); // Prints: hello HELLO
        
        // BiConsumer example
        BiConsumer<String, Integer> printKeyValue = 
            (key, value) -> System.out.println(key + " = " + value);
    }
    
    // 4. Supplier<T> - Takes nothing, returns T
    public void demonstrateSupplier() {
        Supplier<LocalDateTime> currentTime = LocalDateTime::now;
        Supplier<Double> randomNumber = Math::random;
        Supplier<List<String>> emptyList = ArrayList::new;
        
        // Lazy evaluation
        Supplier<ExpensiveObject> lazyObject = () -> new ExpensiveObject();
        // Object only created when get() is called
        ExpensiveObject obj = lazyObject.get();
    }
    
    // Custom functional interface
    @FunctionalInterface
    interface TriFunction<T, U, V, R> {
        R apply(T t, U u, V v);
        
        // Can have default methods
        default TriFunction<T, U, V, R> andThen(Function<? super R, ? extends R> after) {
            Objects.requireNonNull(after);
            return (T t, U u, V v) -> after.apply(apply(t, u, v));
        }
    }
    
    // Using custom functional interface
    public void useCustomInterface() {
        TriFunction<Integer, Integer, Integer, Integer> sum3 = (a, b, c) -> a + b + c;
        Integer result = sum3.apply(1, 2, 3); // 6
    }
}
```

#### Stream API - Complete Operations

**Theoretical Foundation:**
Streams provide a declarative approach to process collections of objects. They support functional-style operations on elements, enabling powerful data manipulation with minimal code.

**Stream Pipeline Components:**
1. **Source**: Collection, array, generator function
2. **Intermediate Operations**: Transform stream (lazy, return new stream)
3. **Terminal Operations**: Produce result or side-effect (eager, consume stream)

```java
public class StreamAPIComplete {
    
    static class Employee {
        private String name;
        private String department;
        private double salary;
        private int age;
        private List<String> skills;
        
        // Constructor, getters, setters...
    }
    
    public void demonstrateStreamOperations() {
        List<Employee> employees = generateEmployees();
        
        // 1. Filtering and Mapping
        List<String> highEarnerNames = employees.stream()
            .filter(e -> e.getSalary() > 75000)
            .map(Employee::getName)
            .collect(Collectors.toList());
        
        // 2. FlatMap - Flattening nested structures
        List<String> allSkills = employees.stream()
            .flatMap(e -> e.getSkills().stream())
            .distinct()
            .sorted()
            .collect(Collectors.toList());
        
        // 3. Reducing - Aggregation operations
        Optional<Double> totalSalary = employees.stream()
            .map(Employee::getSalary)
            .reduce((a, b) -> a + b);
        
        // Alternative with identity
        Double totalSalaryWithIdentity = employees.stream()
            .map(Employee::getSalary)
            .reduce(0.0, Double::sum);
        
        // 4. Grouping and Partitioning
        Map<String, List<Employee>> byDepartment = employees.stream()
            .collect(Collectors.groupingBy(Employee::getDepartment));
        
        Map<String, Double> avgSalaryByDept = employees.stream()
            .collect(Collectors.groupingBy(
                Employee::getDepartment,
                Collectors.averagingDouble(Employee::getSalary)
            ));
        
        Map<Boolean, List<Employee>> partitionBySalary = employees.stream()
            .collect(Collectors.partitioningBy(e -> e.getSalary() > 70000));
        
        // 5. Complex aggregations
        Map<String, DoubleSummaryStatistics> salaryStatsByDept = employees.stream()
            .collect(Collectors.groupingBy(
                Employee::getDepartment,
                Collectors.summarizingDouble(Employee::getSalary)
            ));
        
        // 6. Finding and Matching
        Optional<Employee> anyHighEarner = employees.stream()
            .filter(e -> e.getSalary() > 100000)
            .findAny(); // Non-deterministic
        
        Optional<Employee> firstYoungEmployee = employees.stream()
            .filter(e -> e.getAge() < 25)
            .findFirst(); // Deterministic
        
        boolean allEarnAboveMinimum = employees.stream()
            .allMatch(e -> e.getSalary() > 30000);
        
        boolean anyInEngineering = employees.stream()
            .anyMatch(e -> "Engineering".equals(e.getDepartment()));
        
        boolean noneRetired = employees.stream()
            .noneMatch(e -> e.getAge() > 65);
        
        // 7. Parallel Streams - Multi-threaded processing
        long count = employees.parallelStream()
            .filter(e -> e.getSalary() > 80000)
            .count();
        
        // 8. Custom Collectors
        String names = employees.stream()
            .map(Employee::getName)
            .collect(Collectors.joining(", ", "[", "]"));
        
        // 9. Stream generation
        Stream<Integer> infiniteStream = Stream.iterate(0, n -> n + 2);
        List<Integer> firstTenEven = infiniteStream
            .limit(10)
            .collect(Collectors.toList());
        
        Stream<Double> randomStream = Stream.generate(Math::random);
        randomStream.limit(5).forEach(System.out::println);
    }
    
    // Advanced: Custom Collector
    public static <T> Collector<T, ?, List<T>> toFixedSizeList(int size) {
        return Collector.of(
            ArrayList::new,
            (list, item) -> {
                if (list.size() < size) {
                    list.add(item);
                }
            },
            (list1, list2) -> {
                list1.addAll(list2);
                return list1.subList(0, Math.min(size, list1.size()));
            }
        );
    }
}
```

## Part 2: Spring Boot - Comprehensive Framework Understanding

### 2.1 Spring Core Concepts - Deep Dive

#### Inversion of Control (IoC) Container

**Theoretical Foundation:**
IoC is a design principle where the control of object creation and lifecycle is inverted from the application code to the Spring container. This promotes loose coupling and easier testing.

**How IoC Container Works:**
1. **Bean Definition**: Metadata about objects (XML, annotations, Java config)
2. **Bean Factory**: Core container that creates and manages beans
3. **Application Context**: Advanced container with additional features
4. **Dependency Resolution**: Container injects dependencies automatically

```java
// Understanding Spring Container initialization
public class SpringContainerDeepDive {
    
    // 1. Configuration class - defines beans
    @Configuration
    @ComponentScan(basePackages = "com.aviva.application")
    public class AppConfig {
        
        // Explicit bean definition
        @Bean
        @Scope("singleton") // Default scope
        public DataSource dataSource() {
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl("jdbc:mysql://localhost:3306/avivadb");
            config.setUsername("user");
            config.setPassword("password");
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(5);
            config.setConnectionTimeout(30000);
            return new HikariDataSource(config);
        }
        
        // Bean with dependencies
        @Bean
        public UserRepository userRepository(DataSource dataSource) {
            return new JdbcUserRepository(dataSource);
        }
        
        // Conditional bean creation
        @Bean
        @ConditionalOnProperty(name = "cache.enabled", havingValue = "true")
        public CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("users", "products");
        }
        
        // Bean with custom initialization
        @Bean(initMethod = "init", destroyMethod = "cleanup")
        public ServiceManager serviceManager() {
            return new ServiceManager();
        }
    }
    
    // 2. Component classes - auto-detected by component scan
    @Component
    @Scope("prototype") // New instance for each request
    public class RequestProcessor {
        private final UUID instanceId = UUID.randomUUID();
        
        @Autowired
        private ValidationService validationService;
        
        // Constructor injection (preferred)
        private final LoggingService loggingService;
        
        public RequestProcessor(LoggingService loggingService) {
            this.loggingService = loggingService;
        }
        
        @PostConstruct
        public void initialize() {
            loggingService.log("RequestProcessor initialized: " + instanceId);
        }
        
        @PreDestroy
        public void cleanup() {
            loggingService.log("RequestProcessor destroyed: " + instanceId);
        }
        
        public void processRequest(Request request) {
            validationService.validate(request);
            // Process request
        }
    }
    
    // 3. Understanding Bean Scopes
    @Component
    public class BeanScopeExamples {
        
        // Singleton - One instance per container (default)
        @Service
        @Scope("singleton")
        public static class SingletonService {
            // Shared across all requests
        }
        
        // Prototype - New instance each time
        @Component
        @Scope("prototype")
        public static class PrototypeComponent {
            // New instance for each injection
        }
        
        // Request - One instance per HTTP request (web only)
        @Component
        @Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
        public static class RequestScopedBean {
            // Lives for duration of HTTP request
        }
        
        // Session - One instance per HTTP session (web only)
        @Component
        @Scope(value = "session", proxyMode = ScopedProxyMode.INTERFACES)
        public static class SessionScopedBean {
            // Lives for duration of user session
        }
    }
    
    // 4. Dependency Injection Types
    @Service
    public class DependencyInjectionTypes {
        
        // Field injection (not recommended)
        @Autowired
        private FieldInjectedService fieldService;
        
        // Setter injection
        private SetterInjectedService setterService;
        
        @Autowired
        public void setSetterService(SetterInjectedService service) {
            this.setterService = service;
        }
        
        // Constructor injection (recommended)
        private final ConstructorInjectedService constructorService;
        private final Optional<OptionalService> optionalService;
        
        // Single constructor doesn't need @Autowired (Spring 5+)
        public DependencyInjectionTypes(ConstructorInjectedService constructorService,
                                       Optional<OptionalService> optionalService) {
            this.constructorService = constructorService;
            this.optionalService = optionalService;
        }
        
        // Method injection for prototype beans in singleton
        @Lookup
        public PrototypeBean getPrototypeBean() {
            return null; // Spring overrides this
        }
    }
}
```

#### Aspect-Oriented Programming (AOP)

**Theoretical Foundation:**
AOP enables modularization of cross-cutting concerns (logging, security, transactions) separate from business logic. It works by intercepting method calls and adding behavior.

**Core AOP Concepts:**
- **Aspect**: Module containing cross-cutting concern
- **Join Point**: Point in program execution (method call)
- **Advice**: Action taken at join point
- **Pointcut**: Expression selecting join points
- **Weaving**: Linking aspects with objects

```java
@Configuration
@EnableAspectJAutoProxy
public class AOPConfiguration {
    
    @Aspect
    @Component
    public class LoggingAspect {
        private static final Logger logger = LoggerFactory.getLogger(LoggingAspect.class);
        
        // Pointcut definition
        @Pointcut("@annotation(Loggable)")
        public void loggableMethod() {}
        
        @Pointcut("execution(* com.aviva.service.*.*(..))")
        public void serviceLayer() {}
        
        // Before advice
        @Before("serviceLayer()")
        public void logBefore(JoinPoint joinPoint) {
            logger.info("Executing: {} with args: {}", 
                joinPoint.getSignature().getName(),
                Arrays.toString(joinPoint.getArgs()));
        }
        
        // After returning advice
        @AfterReturning(pointcut = "loggableMethod()", returning = "result")
        public void logAfterReturning(JoinPoint joinPoint, Object result) {
            logger.info("Method {} returned: {}", 
                joinPoint.getSignature().getName(), result);
        }
        
        // After throwing advice
        @AfterThrowing(pointcut = "serviceLayer()", throwing = "exception")
        public void logAfterThrowing(JoinPoint joinPoint, Exception exception) {
            logger.error("Exception in {}: {}", 
                joinPoint.getSignature().getName(), 
                exception.getMessage());
        }
        
        // Around advice - most powerful
        @Around("@annotation(timed)")
        public Object measureExecutionTime(ProceedingJoinPoint joinPoint, 
                                          Timed timed) throws Throwable {
            long startTime = System.currentTimeMillis();
            
            try {
                // Proceed with method execution
                Object result = joinPoint.proceed();
                return result;
            } finally {
                long endTime = System.currentTimeMillis();
                long duration = endTime - startTime;
                
                if (duration > timed.threshold()) {
                    logger.warn("Method {} took {}ms (threshold: {}ms)",
                        joinPoint.getSignature().getName(),
                        duration,
                        timed.threshold());
                } else {
                    logger.info("Method {} executed in {}ms",
                        joinPoint.getSignature().getName(),
                        duration);
                }
            }
        }
    }
    
    // Custom annotations for AOP
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Loggable {
        String value() default "";
    }
    
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Timed {
        long threshold() default 1000; // milliseconds
    }
    
    // Transaction management aspect
    @Aspect
    @Component
    public class TransactionAspect {
        
        @Autowired
        private TransactionManager transactionManager;
        
        @Around("@annotation(transactional)")
        public Object manageTransaction(ProceedingJoinPoint joinPoint,
                                       Transactional transactional) throws Throwable {
            Transaction transaction = transactionManager.beginTransaction();
            
            try {
                Object result = joinPoint.proceed();
                transactionManager.commit(transaction);
                return result;
            } catch (Exception e) {
                transactionManager.rollback(transaction);
                throw e;
            }
        }
    }
}
```

### 2.2 Spring Boot Auto-Configuration - Complete Understanding

**Theoretical Foundation:**
Spring Boot's auto-configuration attempts to automatically configure your Spring application based on jar dependencies, property settings, and existing beans. It uses conditional annotations to selectively enable configurations.

```java
// Understanding how auto-configuration works
@Configuration
@ConditionalOnClass({DataSource.class, JdbcTemplate.class})
@ConditionalOnProperty(name = "spring.datasource.enabled", 
                       havingValue = "true", 
                       matchIfMissing = true)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties properties) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(properties.getUrl());
        config.setUsername(properties.getUsername());
        config.setPassword(properties.getPassword());
        config.setDriverClassName(properties.getDriverClassName());
        
        // Apply additional properties
        if (properties.getMaxPoolSize() != null) {
            config.setMaximumPoolSize(properties.getMaxPoolSize());
        }
        
        return new HikariDataSource(config);
    }
    
    @Bean
    @ConditionalOnBean(DataSource.class)
    @ConditionalOnMissingBean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
    
    // Custom condition
    static class OnDatabaseCondition implements Condition {
        @Override
        public boolean matches(ConditionContext context, 
                             AnnotatedTypeMetadata metadata) {
            Environment env = context.getEnvironment();
            return env.containsProperty("spring.datasource.url") &&
                   !env.getProperty("spring.datasource.url").isEmpty();
        }
    }
    
    @Bean
    @Conditional(OnDatabaseCondition.class)
    public DatabaseHealthIndicator databaseHealthIndicator(DataSource dataSource) {
        return new DatabaseHealthIndicator(dataSource);
    }
}

// Configuration Properties
@ConfigurationProperties(prefix = "spring.datasource")
public class DataSourceProperties {
    private String url;
    private String username;
    private String password;
    private String driverClassName = "com.mysql.cj.jdbc.Driver";
    private Integer maxPoolSize;
    private Duration connectionTimeout = Duration.ofSeconds(30);
    private Map<String, String> additionalProperties = new HashMap<>();
    
    // Getters, setters with validation
    public void setUrl(String url) {
        Assert.hasText(url, "Database URL must not be empty");
        this.url = url;
    }
    
    // Nested configuration
    private Pool pool = new Pool();
    
    public static class Pool {
        private int minIdle = 5;
        private int maxIdle = 10;
        private Duration maxWait = Duration.ofMillis(30000);
        // Getters and setters
    }
}
```

## Part 3: Microservices Architecture - Complete Theory and Implementation

### 3.1 Domain-Driven Design for Microservices

**Theoretical Foundation:**
Domain-Driven Design (DDD) provides strategic patterns for decomposing complex systems into microservices. It emphasizes understanding the business domain and creating boundaries that align with business capabilities.

**Core DDD Concepts:**
- **Bounded Context**: Explicit boundary within which a domain model exists
- **Aggregate**: Cluster of domain objects treated as a single unit
- **Entity**: Object with unique identity
- **Value Object**: Immutable object without identity
- **Domain Event**: Something that happened in the domain

```java
// Bounded Context: Order Management Service
public class OrderManagementContext {
    
    // Aggregate Root
    @Entity
    @Aggregate
    public class Order {
        @Id
        private OrderId orderId; // Value Object as ID
        private CustomerId customerId;
        private OrderStatus status;
        private Money totalAmount; // Value Object
        private List<OrderLineItem> lineItems; // Entities within aggregate
        private ShippingAddress shippingAddress; // Value Object
        private PaymentMethod paymentMethod;
        private LocalDateTime orderDate;
        
        // Domain Events
        private List<DomainEvent> domainEvents = new ArrayList<>();
        
        // Business invariants enforced in aggregate
        public void addLineItem(ProductId productId, int quantity, Money unitPrice) {
            // Business rule: Cannot add items to shipped orders
            if (status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED) {
                throw new OrderModificationException("Cannot modify shipped order");
            }
            
            // Business rule: Maximum 10 different items per order
            if (lineItems.size() >= 10) {
                throw new OrderLimitExceededException("Order cannot have more than 10 items");
            }
            
            OrderLineItem item = new OrderLineItem(productId, quantity, unitPrice);
            lineItems.add(item);
            recalculateTotal();
            
            // Raise domain event
            domainEvents.add(new OrderItemAddedEvent(orderId, productId, quantity));
        }
        
        public void confirmOrder() {
            // State transition with business rules
            if (status != OrderStatus.PENDING) {
                throw new InvalidOrderStateException("Only pending orders can be confirmed");
            }
            
            if (lineItems.isEmpty()) {
                throw new EmptyOrderException("Cannot confirm empty order");
            }
            
            status = OrderStatus.CONFIRMED;
            domainEvents.add(new OrderConfirmedEvent(orderId, customerId, totalAmount));
        }
        
        private void recalculateTotal() {
            totalAmount = lineItems.stream()
                .map(item -> item.getUnitPrice().multiply(item.getQuantity()))
                .reduce(Money.ZERO, Money::add);
        }
    }
    
    // Value Object
    @ValueObject
    public class Money {
        private final BigDecimal amount;
        private final Currency currency;
        
        public Money(BigDecimal amount, Currency currency) {
            // Validation in constructor
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Amount cannot be negative");
            }
            this.amount = amount;
            this.currency = Objects.requireNonNull(currency);
        }
        
        public Money add(Money other) {
            if (!currency.equals(other.currency)) {
                throw new CurrencyMismatchException();
            }
            return new Money(amount.add(other.amount), currency);
        }
        
        public Money multiply(int multiplier) {
            return new Money(amount.multiply(BigDecimal.valueOf(multiplier)), currency);
        }
        
        // Value objects are immutable and compared by value
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Money money = (Money) o;
            return amount.equals(money.amount) && currency.equals(money.currency);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(amount, currency);
        }
    }
    
    // Domain Event
    public abstract class DomainEvent {
        private final LocalDateTime occurredAt;
        private final String aggregateId;
        
        protected DomainEvent(String aggregateId) {
            this.aggregateId = aggregateId;
            this.occurredAt = LocalDateTime.now();
        }
    }
    
    public class OrderConfirmedEvent extends DomainEvent {
        private final CustomerId customerId;
        private final Money orderTotal;
        
        public OrderConfirmedEvent(OrderId orderId, CustomerId customerId, Money orderTotal) {
            super(orderId.getValue());
            this.customerId = customerId;
            this.orderTotal = orderTotal;
        }
    }
}
```

### 3.2 Inter-Service Communication Patterns

**Theoretical Foundation:**
Microservices need to communicate effectively while maintaining loose coupling. Different patterns suit different scenarios based on requirements for consistency, performance, and reliability.

```java
// Synchronous Communication - REST
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    
    private final OrderService orderService;
    private final RestTemplate restTemplate;
    private final WebClient webClient; // Reactive alternative
    
    // Synchronous call to another service
    public OrderDetailsDTO getOrderWithCustomer(@PathVariable String orderId) {
        // Get order from local service
        Order order = orderService.findById(orderId);
        
        // Synchronous call to Customer Service
        CustomerDTO customer = restTemplate.getForObject(
            "http://customer-service/api/customers/" + order.getCustomerId(),
            CustomerDTO.class
        );
        
        // Combine and return
        return new OrderDetailsDTO(order, customer);
    }
    
    // With circuit breaker for resilience
    @CircuitBreaker(name = "inventory-service", fallbackMethod = "checkInventoryFallback")
    public boolean checkInventory(String productId, int quantity) {
        InventoryResponse response = restTemplate.getForObject(
            "http://inventory-service/api/inventory/check?" +
            "productId=" + productId + "&quantity=" + quantity,
            InventoryResponse.class
        );
        return response.isAvailable();
    }
    
    public boolean checkInventoryFallback(String productId, int quantity, Exception ex) {
        // Fallback logic when inventory service is down
        log.warn("Inventory service unavailable, using cached data");
        return inventoryCache.checkAvailability(productId, quantity);
    }
}

// Asynchronous Communication - Message Queue
@Component
public class OrderEventPublisher {
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    // Publish to RabbitMQ
    public void publishOrderCreated(OrderCreatedEvent event) {
        rabbitTemplate.convertAndSend(
            "order.exchange",      // Exchange
            "order.created",       // Routing key
            event
        );
    }
    
    // Publish to Kafka
    public void publishOrderEvent(OrderEvent event) {
        ProducerRecord<String, Object> record = new ProducerRecord<>(
            "order-events",        // Topic
            event.getOrderId(),    // Key for partitioning
            event                  // Value
        );
        
        kafkaTemplate.send(record)
            .addCallback(
                result -> log.info("Event published successfully"),
                ex -> log.error("Failed to publish event", ex)
            );
    }
}

@Component
public class OrderEventConsumer {
    
    // RabbitMQ listener
    @RabbitListener(queues = "payment.processed.queue")
    public void handlePaymentProcessed(PaymentProcessedEvent event) {
        log.info("Payment processed for order: {}", event.getOrderId());
        orderService.updatePaymentStatus(event.getOrderId(), PaymentStatus.COMPLETED);
        
        // Trigger next step in saga
        shippingService.scheduleShipment(event.getOrderId());
    }
    
    // Kafka listener
    @KafkaListener(
        topics = "inventory-events",
        groupId = "order-service-group",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleInventoryEvent(InventoryEvent event) {
        switch (event.getType()) {
            case STOCK_DEPLETED:
                handleStockDepleted(event);
                break;
            case STOCK_REPLENISHED:
                handleStockReplenished(event);
                break;
        }
    }
}

// Saga Pattern for Distributed Transactions
@Component
@Saga
public class OrderSaga {
    
    @Autowired
    private CommandGateway commandGateway;
    
    @StartSaga
    @SagaEventHandler
    public void handle(OrderCreatedEvent event) {
        // Start saga
        String paymentId = UUID.randomUUID().toString();
        commandGateway.send(new ProcessPaymentCommand(
            paymentId,
            event.getOrderId(),
            event.getAmount()
        ));
    }
    
    @SagaEventHandler
    public void handle(PaymentProcessedEvent event) {
        // Payment successful, reserve inventory
        commandGateway.send(new ReserveInventoryCommand(
            event.getOrderId(),
            event.getItems()
        ));
    }
    
    @SagaEventHandler
    public void handle(InventoryReservedEvent event) {
        // Inventory reserved, confirm order
        commandGateway.send(new ConfirmOrderCommand(event.getOrderId()));
    }
    
    @SagaEventHandler
    public void handle(PaymentFailedEvent event) {
        // Compensating transaction
        commandGateway.send(new CancelOrderCommand(event.getOrderId()));
    }
    
    @EndSaga
    @SagaEventHandler
    public void handle(OrderConfirmedEvent event) {
        // Saga completed successfully
        log.info("Order saga completed for: {}", event.getOrderId());
    }
}
```

## Part 4: AWS Cloud Services - Complete Understanding

### 4.1 EC2 and Computing Fundamentals

**Theoretical Foundation:**
Amazon EC2 provides resizable compute capacity in the cloud. Understanding instance types, networking, storage, and pricing models is crucial for efficient cloud architecture.

```python
# EC2 Management with boto3
import boto3
from datetime import datetime, timedelta

class EC2Manager:
    def __init__(self):
        self.ec2_client = boto3.client('ec2')
        self.ec2_resource = boto3.resource('ec2')
    
    def launch_instance_with_best_practices(self):
        """Launch EC2 instance with security and monitoring"""
        
        # User data script for initialization
        user_data = """#!/bin/bash
        yum update -y
        yum install -y amazon-cloudwatch-agent
        
        # Configure CloudWatch agent
        cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOF
        {
            "metrics": {
                "namespace": "MyApp",
                "metrics_collected": {
                    "mem": {
                        "measurement": ["mem_used_percent"],
                        "metrics_collection_interval": 60
                    },
                    "disk": {
                        "measurement": ["used_percent"],
                        "metrics_collection_interval": 60,
                        "resources": ["*"]
                    }
                }
            }
        }
        EOF
        
        # Start CloudWatch agent
        /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
            -a start -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
        
        # Application setup
        aws s3 cp s3://my-bucket/app.jar /opt/app/
        java -jar /opt/app/app.jar
        """
        
        response = self.ec2_client.run_instances(
            ImageId='ami-0abcdef1234567890',  # Amazon Linux 2
            InstanceType='t3.micro',
            MinCount=1,
            MaxCount=1,
            KeyName='my-key-pair',
            SecurityGroupIds=['sg-1234567890abcdef0'],
            SubnetId='subnet-1234567890abcdef0',
            
            # Enable detailed monitoring
            Monitoring={'Enabled': True},
            
            # Instance profile for IAM role
            IamInstanceProfile={
                'Arn': 'arn:aws:iam::123456789012:instance-profile/MyAppRole'
            },
            
            # User data for initialization
            UserData=user_data,
            
            # Tags for organization
            TagSpecifications=[
                {
                    'ResourceType': 'instance',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'MyApp-Server'},
                        {'Key': 'Environment', 'Value': 'Production'},
                        {'Key': 'Owner', 'Value': 'DevOps'},
                        {'Key': 'CostCenter', 'Value': 'Engineering'},
                        {'Key': 'AutoShutdown', 'Value': 'true'}
                    ]
                }
            ],
            
            # Block device mappings
            BlockDeviceMappings=[
                {
                    'DeviceName': '/dev/xvda',
                    'Ebs': {
                        'VolumeSize': 20,
                        'VolumeType': 'gp3',
                        'Iops': 3000,
                        'Throughput': 125,
                        'DeleteOnTermination': True,
                        'Encrypted': True
                    }
                }
            ]
        )
        
        instance_id = response['Instances'][0]['InstanceId']
        return instance_id
    
    def create_auto_scaling_group(self):
        """Create Auto Scaling Group with scaling policies"""
        
        autoscaling = boto3.client('autoscaling')
        
        # Create launch template
        launch_template = self.ec2_client.create_launch_template(
            LaunchTemplateName='MyApp-Template',
            LaunchTemplateData={
                'ImageId': 'ami-0abcdef1234567890',
                'InstanceType': 't3.micro',
                'KeyName': 'my-key-pair',
                'SecurityGroupIds': ['sg-1234567890abcdef0'],
                'IamInstanceProfile': {
                    'Arn': 'arn:aws:iam::123456789012:instance-profile/MyAppRole'
                },
                'UserData': base64.b64encode(user_data.encode()).decode(),
                'TagSpecifications': [
                    {
                        'ResourceType': 'instance',
                        'Tags': [
                            {'Key': 'Name', 'Value': 'MyApp-ASG-Instance'},
                            {'Key': 'ManagedBy', 'Value': 'AutoScaling'}
                        ]
                    }
                ]
            }
        )
        
        # Create Auto Scaling Group
        autoscaling.create_auto_scaling_group(
            AutoScalingGroupName='MyApp-ASG',
            LaunchTemplate={
                'LaunchTemplateId': launch_template['LaunchTemplate']['LaunchTemplateId'],
                'Version': '$Latest'
            },
            MinSize=2,
            MaxSize=10,
            DesiredCapacity=3,
            HealthCheckType='ELB',
            HealthCheckGracePeriod=300,
            VPCZoneIdentifier='subnet-1234,subnet-5678',
            TargetGroupARNs=[
                'arn:aws:elasticloadbalancing:region:account:targetgroup/my-targets/1234'
            ],
            Tags=[
                {
                    'Key': 'Environment',
                    'Value': 'Production',
                    'PropagateAtLaunch': True
                }
            ]
        )
        
        # Create scaling policies
        # Scale up policy
        autoscaling.put_scaling_policy(
            AutoScalingGroupName='MyApp-ASG',
            PolicyName='ScaleUp',
            PolicyType='TargetTrackingScaling',
            TargetTrackingConfiguration={
                'PredefinedMetricSpecification': {
                    'PredefinedMetricType': 'ASGAverageCPUUtilization'
                },
                'TargetValue': 70.0
            }
        )
```

## Part 5: Interview Questions and Answers - Detailed Explanations

### Common Core Java Interview Questions

**Q1: Explain the difference between HashMap and ConcurrentHashMap.**

**Detailed Answer:**
HashMap and ConcurrentHashMap differ fundamentally in thread safety and performance characteristics:

**HashMap:**
- Not thread-safe; multiple threads can cause data corruption
- Allows one null key and multiple null values
- Faster in single-threaded environments
- Fail-fast iterators throw ConcurrentModificationException
- Uses single lock for entire map during synchronized wrapper

**ConcurrentHashMap:**
- Thread-safe without external synchronization
- Doesn't allow null keys or values (throws NullPointerException)
- Uses segment-based locking (16 segments by default in older versions)
- Modern versions use CAS operations and node-based locking
- Weakly consistent iterators don't throw ConcurrentModificationException
- Better concurrent performance through lock striping

**Example demonstrating differences:**
```java
// HashMap - requires external synchronization
Map<String, Integer> hashMap = new HashMap<>();
Map<String, Integer> syncMap = Collections.synchronizedMap(hashMap);

// ConcurrentHashMap - inherently thread-safe
ConcurrentHashMap<String, Integer> concurrentMap = new ConcurrentHashMap<>();

// Atomic operations in ConcurrentHashMap
concurrentMap.compute("key", (k, v) -> v == null ? 1 : v + 1);
concurrentMap.merge("key", 1, Integer::sum);
```

**Q2: What is the difference between checked and unchecked exceptions? When would you use each?**

**Detailed Answer:**
The exception hierarchy in Java distinguishes between checked and unchecked exceptions based on compile-time enforcement:

**Checked Exceptions (extends Exception):**
- Must be declared in method signature or handled
- Represent recoverable conditions
- Examples: IOException, SQLException, ClassNotFoundException
- Use when caller can reasonably recover from the exception

**Unchecked Exceptions (extends RuntimeException):**
- Don't require explicit handling
- Represent programming errors
- Examples: NullPointerException, IllegalArgumentException
- Use for programming errors that shouldn't occur in correct code

**Best Practices:**
```java
// Checked exception for recoverable business logic failure
public class InsufficientBalanceException extends Exception {
    // Use when caller can handle the situation
}

// Unchecked exception for programming error
public class InvalidConfigurationException extends RuntimeException {
    // Use when error indicates bug that needs fixing
}
```

### Spring Boot Interview Questions

**Q3: Explain how Spring Boot auto-configuration works internally.**

**Detailed Answer:**
Spring Boot auto-configuration automatically configures Spring applications based on classpath dependencies, defined beans, and property settings. The process involves:

1. **@EnableAutoConfiguration**: Triggers auto-configuration
2. **AutoConfigurationImportSelector**: Loads configurations from META-INF/spring.factories
3. **@Conditional annotations**: Determine whether to apply configurations
4. **Configuration order**: Uses @AutoConfigureBefore/@AutoConfigureAfter

The framework uses sophisticated condition evaluation:
- **@ConditionalOnClass**: Presence of specific classes
- **@ConditionalOnMissingBean**: Absence of user-defined beans
- **@ConditionalOnProperty**: Property values
- **@ConditionalOnWebApplication**: Web environment detection

**Q4: How do you handle distributed transactions in microservices?**

**Detailed Answer:**
Distributed transactions in microservices are handled through patterns that maintain eventual consistency:

**1. Saga Pattern:**
- Sequence of local transactions
- Each service performs its transaction and publishes events
- Compensation transactions for rollback
- Choreography (event-driven) or Orchestration (central coordinator)

**2. Two-Phase Commit (2PC):**
- Rarely used in microservices due to blocking nature
- Prepare phase and commit phase
- Requires distributed transaction coordinator

**3. Event Sourcing:**
- Store events instead of current state
- Rebuild state from event log
- Natural audit trail and temporal queries

**4. Outbox Pattern:**
- Ensure message publication with database transaction
- Polling or CDC for reliable message delivery

### Behavioral and Situational Questions

**Q5: How do you ensure code quality in your projects?**

**Comprehensive Answer:**
Code quality is maintained through multiple practices:

**1. Code Reviews:**
- Peer reviews before merging
- Focus on logic, patterns, and potential issues
- Knowledge sharing and mentoring opportunity

**2. Testing Strategy:**
- Unit tests for individual components (80% coverage target)
- Integration tests for component interactions
- End-to-end tests for critical user journeys
- Test-Driven Development (TDD) for complex logic

**3. Static Analysis:**
- SonarQube for code quality metrics
- SpotBugs for bug detection
- Checkstyle for coding standards
- PMD for potential problems

**4. Continuous Integration:**
- Automated builds on every commit
- Fail fast on test failures
- Quality gates before deployment

**5. Documentation:**
- Clear README files
- API documentation (Swagger/OpenAPI)
- Inline comments for complex logic
- Architecture decision records

## Part 6: Aviva-Specific Preparation Tips

Based on Aviva Canada's technology stack and culture:

### Technical Focus Areas

1. **Java Ecosystem Mastery:**
   - Spring Boot for microservices
   - JPA/Hibernate for data persistence
   - RESTful API design principles
   - Testing with JUnit and Mockito

2. **Cloud and DevOps:**
   - AWS services (EC2, S3, RDS, Lambda)
   - Docker containerization
   - CI/CD with Jenkins
   - Infrastructure as Code concepts

3. **Microservices Architecture:**
   - Service decomposition strategies
   - Inter-service communication
   - Circuit breakers and resilience patterns
   - API Gateway concepts

4. **Database Knowledge:**
   - SQL optimization
   - NoSQL concepts (MongoDB)
   - Transaction management
   - Data modeling

### Behavioral Preparation

1. **Prepare STAR examples for:**
   - Team collaboration
   - Problem-solving
   - Learning new technologies
   - Handling tight deadlines
   - Code review experiences

2. **Understand Aviva's values:**
   - Care, Commitment, Community, Confidence
   - Customer-centric approach
   - Innovation mindset
   - Collaborative culture

### During the Interview

1. **Technical Discussion:**
   - Think aloud while solving problems
   - Ask clarifying questions
   - Consider edge cases
   - Discuss trade-offs

2. **Code Quality:**
   - Write clean, readable code
   - Handle exceptions properly
   - Consider performance implications
   - Add comments for complex logic

3. **System Design (if asked):**
   - Start with requirements clarification
   - Design high-level architecture
   - Discuss data models
   - Consider scalability and reliability

Remember: The interview assesses both technical skills and cultural fit. Demonstrate enthusiasm for learning, collaborative mindset, and genuine interest in Aviva's mission in the insurance technology space.