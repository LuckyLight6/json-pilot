# JSON Pilot ✈️

> A powerful, modern JSON editor and explorer built with React and Monaco Editor

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Monaco Editor](https://img.shields.io/badge/Monaco%20Editor-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://microsoft.github.io/monaco-editor/)

## ✨ Features

### 🔧 Professional JSON Editing
- **Monaco Editor Integration** - VS Code-level editing experience with syntax highlighting
- **Real-time Validation** - Live JSON syntax checking and error detection
- **Smart Formatting** - One-click JSON beautification and minification
- **Code Folding** - Expand/collapse objects and arrays for better navigation

### 🔍 Advanced Querying
- **JSONPath Support** - Standard JSONPath syntax for precise data extraction
- **JavaScript Expressions** - Custom JavaScript query logic for complex operations
- **Interactive Results** - Query results displayed in elegant modal dialogs
- **Smart Autocomplete** - Query syntax hints and intelligent suggestions

### 🎨 Interactive JSON Manipulation
- **Visual Expand/Collapse** - Click-to-expand nested JSON strings with visual indicators
- **Path Tracking** - JSONPath-based precise positioning within complex structures
- **Hover Tooltips** - Contextual operation hints on mouse hover
- **Decorator System** - Custom visual indicators for enhanced user experience

### 🔄 Comparison Mode
- **Side-by-Side Diff** - Visual comparison of two JSON documents
- **Difference Highlighting** - Clear indication of content differences
- **Real-time Editing** - Edit while comparing for immediate feedback

### 🎭 Theme System
- **Multiple Themes** - Light, Dark, and System auto-switching
- **Monaco Synchronization** - Editor themes sync with UI themes
- **Persistent Preferences** - Theme choices automatically saved

### ⚡ Performance Optimized
- **Smart Code Splitting** - Optimized chunk strategy for faster loading
- **Monaco Optimization** - JSON-only language support to reduce bundle size
- **Tree Shaking** - Elimination of unused code for minimal footprint

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/LuckyLight6/json-pilot.git
cd json-pilot

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Building for Production

```bash
# Build the application
pnpm build

# Preview the build
pnpm preview
```

## 🏗️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | 19.1.0 |
| **Language** | TypeScript | ~5.8.3 |
| **Build Tool** | Vite | 7.0.0 |
| **Editor** | Monaco Editor | 0.52.2 |
| **Styling** | Tailwind CSS | 4.1.11 |
| **State** | Zustand | 5.0.6 |
| **UI Components** | Radix UI | Various |
| **JSON Processing** | jsonc-parser | 3.3.1 |
| **Path Queries** | jsonpath-plus | 10.3.0 |

## 📖 Usage

### Basic JSON Editing

1. **Load JSON**: Paste or type JSON content into the editor
2. **Format**: Use the format button to beautify JSON
3. **Validate**: Real-time validation shows syntax errors
4. **Fold/Unfold**: Click the fold indicators to manage large JSON structures

### JSONPath Queries

```jsonpath
# Get all book titles
$.store.book[*].title

# Get books with price less than 10
$.store.book[?(@.price < 10)]

# Get the first book
$.store.book[0]
```

### JavaScript Queries

```javascript
// Filter and transform data
data.users.filter(user => user.age > 18).map(user => user.name)

// Complex calculations
data.products.reduce((sum, product) => sum + product.price, 0)
```

### Interactive Features

- **Click to Expand**: Click on collapsed JSON strings to expand them inline
- **Hover for Info**: Hover over expandable elements for operation hints
- **Copy Results**: One-click copy for query results and formatted JSON

## 🎯 Key Features Deep Dive

### Smart JSON String Handling

JSON Pilot excels at handling nested JSON strings within JSON documents. When you have JSON data that contains JSON strings as values, you can:

1. **Visual Indicators**: See which strings contain valid JSON
2. **One-Click Expansion**: Click to parse and display nested JSON
3. **Path Preservation**: Maintain JSONPath context during expansion
4. **Seamless Integration**: Expanded content integrates naturally with the editor

### Performance Optimizations

- **Lazy Loading**: Monaco Editor languages loaded on demand
- **Memory Management**: Efficient cleanup of editor instances
- **Debounced Validation**: Smart validation timing to prevent performance issues
- **Optimized Rendering**: Efficient React rendering patterns

## 🔧 Development

### Project Structure

```
src/
├── components/
│   ├── ui/                     # Base UI components (Radix UI based)
│   ├── monaco-editor.tsx       # Monaco Editor wrapper
│   ├── query-bar.tsx          # Query toolbar component
│   ├── json-status-indicator.tsx # JSON status display
│   ├── query-result-modal.tsx  # Query results modal
│   └── theme-provider.tsx     # Theme context provider
├── store/
│   └── editor.ts              # Zustand state management
├── lib/
│   ├── constants.ts           # Application constants
│   ├── editor-utils.ts        # Editor utility functions
│   └── theme-utils.ts         # Theme utility functions
└── App.tsx                    # Main application component
```

### State Management

The application uses Zustand for lightweight state management:

- **Editor State**: Monaco editor instances and content
- **JSON State**: Parsed content, validation errors, and status
- **UI State**: Modal visibility, loading states, and user interactions
- **Theme State**: Current theme and preferences

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Quality

```bash
# Lint code
pnpm lint

# Type checking
pnpm build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor** - For providing the excellent code editor engine
- **Radix UI** - For accessible and customizable UI components
- **Tailwind CSS** - For the utility-first CSS framework
- **JSONPath Plus** - For robust JSONPath query support

## 🔗 Links

- [Live Demo](https://luckylight6.github.io/json-pilot/) (Coming Soon)
- [Report Issues](https://github.com/LuckyLight6/json-pilot/issues)
- [Request Features](https://github.com/LuckyLight6/json-pilot/issues/new)

---

<div align="center">
  <strong>Built with ❤️ for the developer community</strong>
</div>