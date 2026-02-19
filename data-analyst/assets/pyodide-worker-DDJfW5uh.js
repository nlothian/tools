(function(){"use strict";let o=null,t=null;async function n(){return o||t||(t=(async()=>{const{loadPyodide:r}=await import("https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.mjs"),e=await r({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.27.4/full/"});return o=e,e})(),t)}async function a(r){try{self.postMessage({status:"loading-pyodide"});const e=await n();self.postMessage({status:"loading-packages"}),await e.loadPackage(["numpy","pandas","scikit-learn"]),e.globals.set("target_column_json",JSON.stringify(r.targetColumn)),e.globals.set("ignore_columns_json",JSON.stringify(r.ignoreColumns)),e.globals.set("results_json",JSON.stringify({columns:r.columns,rows:r.rows}));const s=_=>{self.postMessage({status:"progress",message:_})};e.globals.set("report_progress",s);const i=await e.runPythonAsync(`
import asyncio
import json, sys, io
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

async def _run():
    _old_stdout = sys.stdout
    sys.stdout = _capture = io.StringIO()

    target_column = json.loads(target_column_json)
    ignore = json.loads(ignore_columns_json)
    results = json.loads(results_json)

    df = pd.DataFrame(results['rows'], columns=results['columns'])

    drop_cols = [target_column] + [c for c in ignore if c in df.columns]
    X = df.drop(columns=drop_cols)
    y = df[target_column]

    numeric_cols = X.select_dtypes(include="number").columns.tolist()
    categorical_cols = X.select_dtypes(exclude="number").columns.tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", SimpleImputer(strategy="median"), numeric_cols),
            (
                "cat",
                Pipeline([
                    ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
                    ("encode", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                ]),
                categorical_cols,
            ),
        ]
    )

    n_estimators = 300
    model_params = dict(max_depth=4, random_state=42, warm_start=True)

    cv_count = 3
    kf = KFold(n_splits=cv_count, shuffle=True, random_state=42)
    rmse_scores, mae_scores, r2_scores, log_rmse_scores = [], [], [], []

    for fold, (train_idx, test_idx) in enumerate(kf.split(X), 1):
        report_progress(f"Training fold {fold}/{cv_count}")
        await asyncio.sleep(0)
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

        X_train_t = preprocessor.fit_transform(X_train)
        X_test_t = preprocessor.transform(X_test)

        model = GradientBoostingRegressor(n_estimators=1, **model_params)
        for i in range(1, n_estimators + 1):
            model.n_estimators = i
            model.fit(X_train_t, y_train)
            if i % 50 == 0 or i == n_estimators:
                report_progress(f"Fold {fold}/{cv_count} \\u2014 estimator {i}/{n_estimators}")
                await asyncio.sleep(0)

        y_pred = model.predict(X_test_t)
        rmse_scores.append(root_mean_squared_error(y_test, y_pred))
        mae_scores.append(mean_absolute_error(y_test, y_pred))
        r2_scores.append(r2_score(y_test, y_pred))

        # RMSE on log-transformed values (only where both are positive)
        y_test_num = pd.to_numeric(y_test, errors='coerce')
        y_pred_num = pd.Series(y_pred, index=y_test.index)
        pos_mask = (y_test_num > 0) & (y_pred_num > 0)
        if pos_mask.sum() > 0:
            log_rmse_scores.append(root_mean_squared_error(
                np.log(y_test_num[pos_mask]), np.log(y_pred_num[pos_mask])
            ))
        else:
            log_rmse_scores.append(float('nan'))

    rmse_arr, mae_arr, r2_arr = np.array(rmse_scores), np.array(mae_scores), np.array(r2_scores)
    log_rmse_arr = np.array(log_rmse_scores)

    print(f"\\n{cv_count}-Fold Cross-Validation Results")
    print("================================")
    print(f"RMSE     : {rmse_arr.mean():>12,.2f} (+/- {rmse_arr.std():,.2f})")
    print(f"Log RMSE : {np.nanmean(log_rmse_arr):>12.4f} (+/- {np.nanstd(log_rmse_arr):.4f})")
    print(f"MAE      : {mae_arr.mean():>12,.2f} (+/- {mae_arr.std():,.2f})")
    print(f"R\\u00b2       : {r2_arr.mean():>12.4f} (+/- {r2_arr.std():.4f})")

    # Fit on full data to extract feature importances
    report_progress("Fitting full model for feature importances")
    await asyncio.sleep(0)
    X_full_t = preprocessor.fit_transform(X)
    model = GradientBoostingRegressor(n_estimators=1, **model_params)
    for i in range(1, n_estimators + 1):
        model.n_estimators = i
        model.fit(X_full_t, y)
        if i % 50 == 0 or i == n_estimators:
            report_progress(f"Full model \\u2014 estimator {i}/{n_estimators}")
            await asyncio.sleep(0)

    feature_names = preprocessor.get_feature_names_out().tolist()

    importances = pd.Series(model.feature_importances_, index=feature_names)
    importances = importances.sort_values(ascending=False)

    print("\\nTop 20 Feature Importances")
    print("==========================")
    for name, importance in importances.head(20).items():
        print(f"{name:<30s} {importance:.4f}")

    _output = _capture.getvalue()
    sys.stdout = _old_stdout
    return _output

await _run()
`);self.postMessage({status:"complete",output:String(i)})}catch(e){const s=e instanceof Error?e.message:String(e);self.postMessage({status:"error",error:s})}}self.addEventListener("message",r=>{const{type:e,data:s}=r.data;e==="run"&&a(s)})})();
