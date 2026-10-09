import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, OrdinalEncoder, StandardScaler

df = pd.read_csv("Student_Social_Media_And_Mental_Health_Impact.csv")
df = df.drop_duplicates()
df["Physical_Activity_Hours"] = df["Physical_Activity_Hours"].clip(lower=0)

# FIX 1: top_countries includes "Other" and everything else maps to "Other"
# (the notebook mapped to lowercase "other", which created a second, separate category).
top_countries = df["Country"].value_counts().index[:10].tolist()
df["Grouped_country"] = df["Country"].apply(lambda c: c if c in top_countries else "Other")
print("top_countries =", top_countries)

skewed_col = ["Study_Hours"]
numeric_cols = ["Age", "Avg_Daily_Usage_Hours", "Daily_Unlocks", "Physical_Activity_Hours", "Sleep_Hours_Per_Night"]
ordinal_col = ["Stress_Level"]
nominal_cols = ["Gender", "Academic_Level", "Most_Used_Platform", "Purpose_Of_Use", "Grouped_country"]

X = df[skewed_col + numeric_cols + ordinal_col + nominal_cols]
y = df["Mental_Health_Score"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.30, random_state=42)

pre = ColumnTransformer([
    ("skew", Pipeline([("log", FunctionTransformer(np.log1p)), ("scale", StandardScaler())]), skewed_col),
    ("num", StandardScaler(), numeric_cols),
    ("ord", OrdinalEncoder(categories=[["Low", "Medium", "High", "Very High"]]), ordinal_col),
    ("nom", OneHotEncoder(handle_unknown="ignore"), nominal_cols),
])
pipe = Pipeline([("preprocessor", pre), ("random forest", RandomForestRegressor(random_state=42))])

# FIX 2: actually FIT the pipeline before saving (the old .pkl contained an unfitted model).
pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)
print(f"Test R2 = {r2_score(y_test, pred):.3f}   MAE = {mean_absolute_error(y_test, pred):.3f}")

joblib.dump({"model": pipe, "top_countries": top_countries}, "Mental_Health_Model21.pkl")
print("Saved Mental_Health_Model21.pkl")
