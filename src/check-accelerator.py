"""Parse candidate source as data. Never import or execute generated code."""
import ast
import json
import sys

data = json.load(sys.stdin)
checks = []
def check(name, passed):
    checks.append({"name": name, "passed": bool(passed)})

try:
    baseline = ast.parse(data["baseline"])
    candidate = ast.parse(data["candidate"])
    check("Python syntax parses", True)
    def functions(tree):
        return {n.name: ast.dump(n, include_attributes=False) for n in tree.body if isinstance(n, ast.FunctionDef)}
    old, new = functions(baseline), functions(candidate)
    for name in ("mean_pool", "normalize_vectors"):
        check(name + " AST preserved", old.get(name) == new.get(name) and name in new)
    constants = {}
    for n in candidate.body:
        if isinstance(n, ast.Assign) and isinstance(n.value, ast.Constant):
            for target in n.targets:
                if isinstance(target, ast.Name):
                    constants[target.id] = n.value.value
    check("Model identity preserved in code", constants.get("MODEL_ID") == data["config"]["model_id"])
    check("TPU device configured in code", constants.get("DEVICE") == "tpu")
    check("Requested batch size in code", constants.get("BATCH_SIZE") == data["batchSize"])
    check("Token length preserved in code", constants.get("MAX_LENGTH") == 256)
    check("TorchTPU backend imported", any(isinstance(n, ast.Import) and any(a.name == "torch_tpu" for a in n.names) for n in candidate.body))
    # Allow only the explicit device and batch-size changes plus the backend import.
    # This deliberately narrow gate is a structural contract, not runtime parity.
    allowed = {"DEVICE": "cuda", "BATCH_SIZE": 8}
    candidate.body = [n for n in candidate.body if not (isinstance(n, ast.Import) and all(a.name == "torch_tpu" for a in n.names))]
    for n in candidate.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name) and n.targets[0].id in allowed:
            n.value = ast.Constant(value=allowed[n.targets[0].id])
    for tree in (baseline, candidate):
        tree.body = [n for n in tree.body if not (isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str))]
    check("Only approved source transformations", ast.dump(candidate, include_attributes=False) == ast.dump(baseline, include_attributes=False))
except (SyntaxError, ValueError, TypeError, KeyError) as exc:
    checks.append({"name": "Source structure readable", "passed": False, "detail": str(exc)[:250]})
print(json.dumps(checks))
