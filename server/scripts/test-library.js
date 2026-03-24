const { createFile, deleteFile, runpy } = require('../utils/compilerUtils');

async function testLibrary() {
    const code = `from abc import ABC, abstractmethod
import json
import os

class Person(ABC):
    def __init__(self, name):
        self.name = name
    @abstractmethod
    def get_role(self):
        pass

class User(Person):
    def __init__(self, name):
        super().__init__(name)
        self.borrowed_books = []
    def get_role(self):
        return "User"
    def borrow_book(self, book):
        if book.available:
            self.borrowed_books.append(book.title)
            book.available = False
            print(f"{self.name} borrowed {book.title}")
        else:
            print("Book not available")
    def return_book(self, book):
        if book.title in self.borrowed_books:
            self.borrowed_books.remove(book.title)
            book.available = True
            print(f"{self.name} returned {book.title}")
        else:
            print("You didn't borrow this book")

class Librarian(Person):
    def get_role(self):
        return "Librarian"
    def add_book(self, library, book):
        library.add_book(book)
        print(f"Book '{book.title}' added")
    def remove_book(self, library, title):
        library.remove_book(title)
        print(f"Book '{title}' removed")

class Book:
    def __init__(self, title, author):
        self.title = title
        self.author = author
        self.available = True
    def __str__(self):
        status = "Available" if self.available else "Not Available"
        return f"{self.title} by {self.author} [{status}]"

class Library:
    def __init__(self):
        self.books = []
        self.file = "library.json"
        self.load_books()
    def add_book(self, book):
        self.books.append(book)
        self.save_books()
    def remove_book(self, title):
        self.books = [b for b in self.books if b.title != title]
        self.save_books()
    def display_books(self):
        if not self.books:
            print("No books available")
            return
        for book in self.books:
            print(book)
    def find_book(self, title):
        for book in self.books:
            if book.title == title:
                return book
        return None
    def save_books(self):
        data = []
        for b in self.books:
            data.append({"title": b.title, "author": b.author, "available": b.available})
        with open(self.file, "w") as f:
            json.dump(data, f)
    def load_books(self):
        if not os.path.exists(self.file):
            return
        with open(self.file, "r") as f:
            data = json.load(f)
            for item in data:
                book = Book(item["title"], item["author"])
                book.available = item["available"]
                self.books.append(book)

def main():
    library = Library()
    user = User("Alice")
    librarian = Librarian("Admin")
    while True:
        print("\\n--- Library System ---")
        print("1. View Books")
        print("2. Add Book (Librarian)")
        print("3. Remove Book (Librarian)")
        print("4. Borrow Book")
        print("5. Return Book")
        print("6. Exit")
        choice = input("Enter choice: ")
        if choice == "1":
            library.display_books()
        elif choice == "2":
            title = input("Enter title: ")
            author = input("Enter author: ")
            librarian.add_book(library, Book(title, author))
        elif choice == "3":
            title = input("Enter title to remove: ")
            librarian.remove_book(library, title)
        elif choice == "4":
            title = input("Enter book to borrow: ")
            book = library.find_book(title)
            if book:
                user.borrow_book(book)
            else:
                print("Book not found")
        elif choice == "5":
            title = input("Enter book to return: ")
            book = library.find_book(title)
            if book:
                user.return_book(book)
            else:
                print("Book not found")
        elif choice == "6":
            print("Exiting system...")
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
`;

    // Simulate: Add book "Python" by "Guido", View, Borrow "Python", View, Exit
    const input = `2\nPython\nGuido\n1\n4\nPython\n1\n6`;

    const codePath = await createFile(code, 'py');
    const inputPath = await createFile(input, 'txt');

    try {
        const [stdout, stderr] = await runpy(codePath, inputPath);
        const output = stdout.replace(/\r\n/g, '\n');
        
        console.log('=== ACTUAL OUTPUT ===');
        console.log(output);
        
        if (stderr) {
            console.log('\n=== STDERR ===');
            console.log(stderr);
        }

        // Verify key outputs
        console.log('\n=== VERIFICATION ===');
        const checks = [
            ["Book 'Python' added", "Add book confirmation"],
            ["Python by Guido [Available]", "Book listed as Available after adding"],
            ["Alice borrowed Python", "Borrow confirmation"],
            ["Python by Guido [Not Available]", "Book listed as Not Available after borrowing"],
            ["Exiting system...", "Clean exit"],
        ];

        let allPassed = true;
        for (const [expected, desc] of checks) {
            if (output.includes(expected)) {
                console.log(`  ✅ ${desc}: "${expected}"`);
            } else {
                console.log(`  ❌ ${desc}: Expected "${expected}" not found`);
                allPassed = false;
            }
        }

        console.log(allPassed ? '\n🎉 All output checks PASSED!' : '\n⚠️ Some checks FAILED.');
    } finally {
        deleteFile(codePath);
        deleteFile(inputPath);
    }
}

testLibrary().catch(err => console.error('Error:', err));
