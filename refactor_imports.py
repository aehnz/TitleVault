import os
import re

directories_to_scan = [
    '/Users/aehnz/Desktop/UDHBHA_FINAL (1)/surveyhub-registry/src',
    '/Users/aehnz/Desktop/UDHBHA_FINAL (1)/property-auditor-hub/src'
]

type_imports_regex = re.compile(
    r"import\s+(?:type\s+)?{([^}]+)}\s+from\s+['\"](?:@/types/[^'\"]+|.*?/types)['\"];?"
)

for d in directories_to_scan:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.ts') or f.endswith('.tsx'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                # Check for @/types/* or ../types or ./types
                if 'types/' in content or '/types' in content or '@/types' in content:
                    # Find all matches
                    matches = type_imports_regex.findall(content)
                    if matches:
                        # Find unique tokens being imported across all matches
                        tokens = set()
                        for m in matches:
                            for token in m.split(','):
                                t = token.strip()
                                if t:
                                    tokens.add(t)
                        
                        
                        # Replace them
                        new_content = type_imports_regex.sub('', content)
                        
                        # add the new import right after the last import
                        import_lines = [line for line in new_content.split('\n') if line.startswith('import ')]
                        
                        replacement = f"import {{ {', '.join(sorted(tokens))} }} from '@udhbha/types';\n"
                        
                        # Clean up multiple blank lines left by regex
                        new_content = re.sub(r'\n{3,}', '\n\n', new_content)
                        
                        if import_lines:
                            last_import = import_lines[-1]
                            new_content = new_content.replace(last_import, f"{last_import}\n{replacement}", 1)
                        else:
                            new_content = replacement + "\n" + new_content

                        print(f"Updated {path}")
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(new_content)
