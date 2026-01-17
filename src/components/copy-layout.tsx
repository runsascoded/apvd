import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import css from "../App.module.scss";
import React from "react";

export const CopyLayout = ({ label, shapesTextFn, wrap, }: { label: string, shapesTextFn: () => (string | undefined), wrap?: boolean }) => {
    const shapeText = shapesTextFn()
    return (
        shapeText &&
        <OverlayTrigger overlay={<Tooltip className={css.copyTextTooltip}>
            <pre className={`${css.shapeTextTooltip} ${wrap ? css.wrap : ''}`}>{shapeText}</pre>
        </Tooltip>}>
            <span className={css.copyText}
                  onClick={() => navigator.clipboard.writeText(shapeText)
                  }>{label}</span>
        </OverlayTrigger>
    )
}

export default CopyLayout
