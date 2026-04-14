import os
count = 0
for d in ["surveyhub-registry/src", "property-auditor-hub/src"]:
    for r, _, fs in os.walk(d):
        for f in fs:
            if f.endswith(".ts") or f.endswith(".tsx"):
                p = os.path.join(r, f)
                with open(p, "r") as fl:
                    c = fl.read()
                
                new_lines = []
                changed = False
                for i, l in enumerate(c.split("\n")):
                    if ("} from '" in l or "} from \"" in l) and not l.strip().startswith("import"):
                        if "{" not in l:
                            l = "import { " + l.lstrip()
                            changed = True
                    new_lines.append(l)
                
                if changed:
                    with open(p, "w") as fl:
                        fl.write("\n".join(new_lines))
                    print(f"Fixed {p}")
                    count += 1
print(f"Fixed {count} files")
