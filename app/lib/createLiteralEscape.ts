export function createLiteralEscape(input: string): string {
    // Clean the input first to remove any existing escaping
    const cleaned = input
        .replace(/\\n/g, '\n')   // Unescape any existing newlines
        .replace(/\\t/g, '\t')   // Unescape any existing tabs
        .replace(/\\"/g, '"')    // Unescape any existing quotes
        .replace(/\\\\/g, '\\'); // Unescape any existing backslashes

    // Now properly escape for JSON
    return cleaned
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t')   // Escape tabs
        .replace(/\0/g, '\\0')   // Escape null characters
        .replace(/\b/g, '\\b')   // Escape backspace
        .replace(/\f/g, '\\f')   // Escape form feed
        .replace(/\v/g, '\\v');  // Escape vertical tab
}

export function unescapeLiteral(escaped: string): string {
    return escaped
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\v/g, '\v')
        .replace(/\\0/g, '\0')
        .replace(/\\\\/g, '\\');  // This should be last
}