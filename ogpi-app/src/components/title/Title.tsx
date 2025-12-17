import React from "react";
import "./Title.css";

type PageTitleProps = {
  title: string;
  subtitle?: string;
};

const Title: React.FC<PageTitleProps> = ({ title, subtitle }) => (
  <div className="container-fluid">
    <div className="row">
      <div className="col-12 col-md-10 col-lg-8">
        <h1 className="page-title">{title}</h1>
        {subtitle && <h4 className="page-subtitle">{subtitle}</h4>}
      </div>
    </div>
  </div>
);

export default Title;
